package realtime

import (
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait       = 10 * time.Second
	pongWait        = 60 * time.Second
	pingPeriod      = (pongWait * 9) / 10
	maxMessageSize  = 64 * 1024 // 64KB
	sendBufferSize  = 256
)

// Client is a WebSocket connection in a diagram room.
type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	diagramID uuid.UUID
	userID   uuid.UUID
	email    string
}

// Run registers the client with the hub and runs read/write pumps until disconnect.
func (c *Client) Run() {
	c.hub.Register(c)
	defer func() {
		c.hub.Unregister(c)
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	go c.writePump()
	c.readPump()
}

// Send queues a message to be sent to the client (non-blocking).
func (c *Client) Send(data []byte) {
	select {
	case c.send <- data:
	default:
		// buffer full; skip to avoid blocking hub
	}
}

func (c *Client) readPump() {
	defer close(c.send)
	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("realtime: read error: %v", err)
			}
			break
		}
		var msg Message
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}
		switch msg.Type {
		case "cursor":
			c.hub.BroadcastCursor(c, msg.Position)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()
	for {
		select {
		case data, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
