import { memo } from "react";

interface CursorPosition {
  x: number;
  y: number;
}

interface Collaborator {
  id: string;
  user_id: string;
  email?: string;
  cursor: CursorPosition | null;
  color: string;
}

interface CollaboratorCursorsProps {
  collaborators: Collaborator[];
  canvasOffset?: { x: number; y: number };
}

export const CollaboratorCursors = memo(function CollaboratorCursors({ 
  collaborators,
  canvasOffset = { x: 0, y: 0 }
}: CollaboratorCursorsProps) {
  return (
    <>
      {collaborators.map((collaborator) => {
        if (!collaborator.cursor) return null;

        const displayName = collaborator.email?.split('@')[0] || 'User';
        
        return (
          <div
            key={collaborator.id}
            className="absolute pointer-events-none z-50 transition-all duration-75"
            style={{
              left: collaborator.cursor.x + canvasOffset.x,
              top: collaborator.cursor.y + canvasOffset.y,
            }}
          >
            {/* Cursor pointer */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: collaborator.color }}
            >
              <path
                d="M5.65376 12.4567L5.45386 12.5373L5.65376 12.4567L5.65376 12.4567L12.0001 2L18.3464 12.4567L18.5463 12.5373L18.3464 12.4567C18.4847 12.6882 18.5276 12.9661 18.4654 13.2287C18.4032 13.4913 18.2411 13.7192 18.0096 13.8575L12.0001 17.5L5.99059 13.8575C5.75901 13.7192 5.59695 13.4913 5.53474 13.2287C5.47254 12.9661 5.51545 12.6882 5.65376 12.4567Z"
                fill={collaborator.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            
            {/* Name label */}
            <div
              className="absolute top-5 left-3 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-md"
              style={{ backgroundColor: collaborator.color }}
            >
              {displayName}
            </div>
          </div>
        );
      })}
    </>
  );
});
