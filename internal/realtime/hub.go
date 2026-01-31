package realtime

import (
	"encoding/json"
	"sync"

	"github.com/google/uuid"
)

// Message is a JSON payload sent over the WebSocket (client <-> server).
type Message struct {
	Type    string          `json:"type"`    // join, leave, cursor, presence
	UserID  string          `json:"user_id,omitempty"`
	Email   string          `json:"email,omitempty"`
	Position json.RawMessage `json:"position,omitempty"` // cursor position (opaque JSON)
	Users   []UserPresence  `json:"users,omitempty"`     // for presence list
}

// UserPresence is a user in the room (for presence broadcasts).
type UserPresence struct {
	UserID   string          `json:"user_id"`
	Email    string          `json:"email,omitempty"`
	Position json.RawMessage `json:"position,omitempty"`
}

// Hub holds rooms keyed by diagram ID and broadcasts messages to room members.
type Hub struct {
	mu    sync.RWMutex
	rooms map[uuid.UUID]map[*Client]struct{} // diagramID -> set of clients
}

// NewHub returns a new Hub.
func NewHub() *Hub {
	return &Hub{
		rooms: make(map[uuid.UUID]map[*Client]struct{}),
	}
}

// Register adds a client to the diagram room and broadcasts join to others.
func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	if h.rooms[c.diagramID] == nil {
		h.rooms[c.diagramID] = make(map[*Client]struct{})
	}
	h.rooms[c.diagramID][c] = struct{}{}
	room := make([]*Client, 0, len(h.rooms[c.diagramID]))
	for cl := range h.rooms[c.diagramID] {
		room = append(room, cl)
	}
	h.mu.Unlock()

	// Notify others in room that this user joined
	joinMsg := Message{Type: "join", UserID: c.userID.String(), Email: c.email}
	h.broadcastToRoom(c.diagramID, &joinMsg, c)

	// Send current presence list to the new client
	h.sendPresenceTo(c)
}

// Unregister removes the client from the room and broadcasts leave.
func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	if room, ok := h.rooms[c.diagramID]; ok {
		delete(room, c)
		if len(room) == 0 {
			delete(h.rooms, c.diagramID)
		}
	}
	h.mu.Unlock()

	leaveMsg := Message{Type: "leave", UserID: c.userID.String()}
	h.broadcastToRoom(c.diagramID, &leaveMsg, nil)
}

// BroadcastCursor sends a cursor update from the client to others in the room.
func (h *Hub) BroadcastCursor(c *Client, position json.RawMessage) {
	msg := Message{Type: "cursor", UserID: c.userID.String(), Position: position}
	h.broadcastToRoom(c.diagramID, &msg, c)
}

// broadcastToRoom sends msg to all clients in the diagram room except skip.
func (h *Hub) broadcastToRoom(diagramID uuid.UUID, msg *Message, skip *Client) {
	payload, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.mu.RLock()
	room := h.rooms[diagramID]
	if room == nil {
		h.mu.RUnlock()
		return
	}
	clients := make([]*Client, 0, len(room))
	for cl := range room {
		if cl != skip {
			clients = append(clients, cl)
		}
	}
	h.mu.RUnlock()
	for _, cl := range clients {
		cl.Send(payload)
	}
}

// sendPresenceTo sends the current list of users in the room to the given client.
func (h *Hub) sendPresenceTo(c *Client) {
	h.mu.RLock()
	room := h.rooms[c.diagramID]
	if room == nil {
		h.mu.RUnlock()
		return
	}
	users := make([]UserPresence, 0, len(room))
	for cl := range room {
		users = append(users, UserPresence{UserID: cl.userID.String(), Email: cl.email})
	}
	h.mu.RUnlock()
	msg := Message{Type: "presence", Users: users}
	payload, err := json.Marshal(msg)
	if err != nil {
		return
	}
	c.Send(payload)
}
