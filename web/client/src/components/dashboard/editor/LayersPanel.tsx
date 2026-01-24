import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Trash2,
  X,
  Layers,
} from 'lucide-react';
import { Canvas as FabricCanvas, FabricObject } from 'fabric';

interface LayersPanelProps {
  fabricCanvas: FabricCanvas | null;
  isOpen: boolean;
  onClose: () => void;
  selectedObject: FabricObject | null;
  onSelectObject: (obj: FabricObject | null) => void;
}

export function LayersPanel({
  fabricCanvas,
  isOpen,
  onClose,
  selectedObject,
  onSelectObject,
}: LayersPanelProps) {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const getObjects = React.useCallback(() => {
    if (!fabricCanvas) return [];
    return fabricCanvas
      .getObjects()
      .filter((obj) => !(obj as any).isLabel)
      .reverse();
  }, [fabricCanvas]);

  const toggleVisibility = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    obj.visible = !obj.visible;
    fabricCanvas.renderAll();
    forceUpdate();
  };

  const toggleLock = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    obj.selectable = !obj.selectable;
    obj.evented = obj.selectable;
    fabricCanvas.renderAll();
    forceUpdate();
  };

  const moveUp = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    fabricCanvas.bringObjectForward(obj);
    fabricCanvas.renderAll();
    forceUpdate();
  };

  const moveDown = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    fabricCanvas.sendObjectBackwards(obj);
    fabricCanvas.renderAll();
    forceUpdate();
  };

  const deleteObject = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    
    const shapeId = (obj as any).shapeId;
    
    // Remove associated labels
    fabricCanvas.getObjects().forEach((o) => {
      if ((o as any).parentShapeId === shapeId) {
        fabricCanvas.remove(o);
      }
    });
    
    // Remove connected connectors
    fabricCanvas.getObjects().forEach((o) => {
      if ((o as any).isConnector) {
        if ((o as any).startObjectId === shapeId || (o as any).endObjectId === shapeId) {
          fabricCanvas.remove(o);
        }
      }
    });
    
    fabricCanvas.remove(obj);
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    onSelectObject(null);
    forceUpdate();
  };

  const selectObject = (obj: FabricObject) => {
    if (!fabricCanvas || !obj.selectable) return;
    fabricCanvas.setActiveObject(obj);
    fabricCanvas.renderAll();
    onSelectObject(obj);
  };

  const getObjectName = (obj: FabricObject) => {
    const customLabel = (obj as any).customLabel;
    if (customLabel) return customLabel;
    
    const shapeType = (obj as any).shapeType;
    if (shapeType) return shapeType.charAt(0).toUpperCase() + shapeType.slice(1);
    
    if ((obj as any).isConnector) return 'Connector';
    
    const type = obj.type;
    return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Object';
  };

  const getObjectColor = (obj: FabricObject): string => {
    const fill = obj.fill;
    if (typeof fill === 'string') return fill;
    return '#6366f1';
  };

  return (
    <div
      className={`absolute top-0 left-64 h-full w-56 bg-background border-r border-border shadow-lg flex flex-col z-30 transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Layers</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {getObjects().length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No objects on canvas</p>
            </div>
          ) : (
            <div className="space-y-1">
              {getObjects().map((obj, index) => {
                const isSelected = selectedObject === obj;
                const isVisible = obj.visible !== false;
                const isLocked = !obj.selectable;

                return (
                  <div
                    key={(obj as any).shapeId || index}
                    className={`flex items-center gap-1 p-1.5 rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted border border-transparent'
                    } ${!isVisible ? 'opacity-50' : ''}`}
                    onClick={() => selectObject(obj)}
                  >
                    {/* Color indicator */}
                    <div
                      className="w-4 h-4 rounded shrink-0"
                      style={{ backgroundColor: getObjectColor(obj) }}
                    />
                    
                    {/* Name */}
                    <span className={`flex-1 text-xs truncate ${isLocked ? 'text-muted-foreground' : ''}`}>
                      {getObjectName(obj)}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(obj);
                        }}
                      >
                        {isVisible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLock(obj);
                        }}
                      >
                        {isLocked ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Layer actions */}
      {selectedObject && (
        <div className="p-2 border-t border-border">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => moveUp(selectedObject)}
            >
              <ChevronUp className="h-3 w-3 mr-1" />
              Up
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => moveDown(selectedObject)}
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              Down
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => deleteObject(selectedObject)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
