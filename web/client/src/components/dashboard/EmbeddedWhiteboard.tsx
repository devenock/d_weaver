import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush, Circle, Rect, Textbox, FabricImage, Group } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Pencil, Square, Circle as CircleIcon, Type, Eraser, Save, Download, FileDown, 
  Undo, Redo, StickyNote, History, Lightbulb, MessageSquare, CheckSquare, AlertCircle,
  Users, GitBranch, Link2, Unlink, Plus
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ApiUser } from "@/lib/auth-api";
import jsPDF from "jspdf";
import { useWhiteboardHistory } from "@/hooks/useWhiteboardHistory";
import { useWhiteboardCollaboration } from "@/hooks/useWhiteboardCollaboration";
import { HistoryPanel } from "./editor/HistoryPanel";
import { CollaboratorCursors } from "./whiteboard/CollaboratorCursors";
import { groupSelectedObjects, ungroupSelectedObject } from "./whiteboard/StickyNoteGrouping";
import { createMindMapTemplate, addChildNode, updateMindMapConnections } from "./whiteboard/MindMapTool";

interface EmbeddedWhiteboardProps {
  diagramId?: string | null;
  user: ApiUser | null;
  onClose: () => void;
  onSave?: () => void;
}

const COLORS = [
  "#000000", // Black
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#22C55E", // Green
  "#F59E0B", // Orange/Yellow
  "#A855F7", // Purple
];

// Sticky note colors for brainstorming
const STICKY_COLORS = [
  { bg: "#FEF3C7", border: "#F59E0B", name: "Yellow" },
  { bg: "#DBEAFE", border: "#3B82F6", name: "Blue" },
  { bg: "#D1FAE5", border: "#10B981", name: "Green" },
  { bg: "#FCE7F3", border: "#EC4899", name: "Pink" },
  { bg: "#E0E7FF", border: "#6366F1", name: "Purple" },
];

export function EmbeddedWhiteboard({ diagramId, user, onClose: _onClose, onSave }: EmbeddedWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "eraser" | "rectangle" | "circle" | "text" | "sticky" | "idea" | "task" | "question" | "warning" | "mindmap">("select");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [saving, setSaving] = useState(false);
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(diagramId || null);
  const [whiteboardTitle, setWhiteboardTitle] = useState("Untitled Whiteboard");
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [stickyColorIndex, setStickyColorIndex] = useState(0);
  const [mindMapMode, setMindMapMode] = useState(false);
  
  // Real-time collaboration
  const { 
    collaborators, 
    isConnected, 
    updateCursor 
  } = useWhiteboardCollaboration(currentDiagramId, user);
  
  // Use custom history hook
  const { 
    history, 
    historyStep, 
    saveState, 
    initializeHistory, 
    undo, 
    redo, 
    jumpToStep,
    canUndo, 
    canRedo 
  } = useWhiteboardHistory(fabricCanvas);
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: "#ffffff",
    });

    const handleResize = () => {
      canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      canvas.renderAll();
    };

    window.addEventListener("resize", handleResize);

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please drop an image file");
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const imgUrl = event.target?.result as string;
        const imgElement = new Image();
        imgElement.src = imgUrl;

        imgElement.onload = () => {
          const fabricImg = new FabricImage(imgElement, {
            left: 100,
            top: 100,
            scaleX: 0.5,
            scaleY: 0.5,
          });
          canvas.add(fabricImg);
          canvas.setActiveObject(fabricImg);
          canvas.renderAll();
          toast.success("Image added to canvas!");
        };
      };
      reader.readAsDataURL(file);
    };

    const canvasElement = canvasRef.current;
    canvasElement.addEventListener("dragover", handleDragOver);
    canvasElement.addEventListener("drop", handleDrop);

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = strokeColor;
    canvas.freeDrawingBrush.width = 2;

    setFabricCanvas(canvas);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvasElement.removeEventListener("dragover", handleDragOver);
      canvasElement.removeEventListener("drop", handleDrop);
      canvas.dispose();
    };
  }, []);

  // Initialize history and set up canvas event listeners
  useEffect(() => {
    if (!fabricCanvas) return;

    initializeHistory();

    const handleStateChange = () => saveState();

    fabricCanvas.on("object:added", handleStateChange);
    fabricCanvas.on("object:modified", handleStateChange);
    fabricCanvas.on("object:removed", handleStateChange);
    
    // Update mind map connections when objects move
    const handleMoving = () => {
      if (mindMapMode) {
        updateMindMapConnections(fabricCanvas);
      }
    };
    
    fabricCanvas.on("object:moving", handleMoving);
    fabricCanvas.on("object:modified", handleMoving);

    return () => {
      fabricCanvas.off("object:added", handleStateChange);
      fabricCanvas.off("object:modified", handleStateChange);
      fabricCanvas.off("object:removed", handleStateChange);
      fabricCanvas.off("object:moving", handleMoving);
    };
  }, [fabricCanvas, initializeHistory, saveState, mindMapMode]);

  // Keyboard shortcuts for undo/redo and grouping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
      // Group: Ctrl+G
      if ((e.metaKey || e.ctrlKey) && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        if (fabricCanvas) {
          groupSelectedObjects(fabricCanvas);
          saveState();
        }
      }
      // Ungroup: Ctrl+Shift+G
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "G") {
        e.preventDefault();
        if (fabricCanvas) {
          ungroupSelectedObject(fabricCanvas);
          saveState();
        }
      }
      // Add child node in mind map mode: Tab
      if (e.key === "Tab" && mindMapMode && fabricCanvas) {
        e.preventDefault();
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject && (activeObject as any).mindMapData) {
          addChildNode(fabricCanvas, activeObject as Group, "New Node");
          saveState();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, fabricCanvas, mindMapMode, saveState]);

  // Cursor tracking for collaboration
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !isConnected) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    updateCursor({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [updateCursor, isConnected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", () => updateCursor(null));

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", () => updateCursor(null));
    };
  }, [handleMouseMove, updateCursor]);

  useEffect(() => {
    const loadDiagram = async () => {
      if (!diagramId || !fabricCanvas) return;

      try {
        const { data, error } = await supabase
          .from("diagrams")
          .select("*")
          .eq("id", diagramId)
          .single();

        if (error) throw error;

        if (data) {
          setWhiteboardTitle(data.title);
          setCurrentDiagramId(data.id);

          if (data.content && data.content !== "whiteboard") {
            const canvasData = JSON.parse(data.content);
            await fabricCanvas.loadFromJSON(canvasData);
            fabricCanvas.renderAll();
          }
        }
      } catch (error: any) {
        toast.error("Failed to load whiteboard: " + error.message);
      }
    };

    loadDiagram();
  }, [diagramId, fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw" || activeTool === "eraser";

    if (fabricCanvas.freeDrawingBrush) {
      if (activeTool === "eraser") {
        fabricCanvas.freeDrawingBrush.color = "#ffffff";
        fabricCanvas.freeDrawingBrush.width = 20;
      } else if (activeTool === "draw") {
        fabricCanvas.freeDrawingBrush.color = strokeColor;
        fabricCanvas.freeDrawingBrush.width = 2;
      }
    }
  }, [activeTool, strokeColor, fabricCanvas]);

  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool);

    if (!fabricCanvas) return;

    if (tool === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: strokeColor,
        strokeWidth: 2,
        width: 150,
        height: 100,
      });
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      setActiveTool("select");
    } else if (tool === "circle") {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: strokeColor,
        strokeWidth: 2,
        radius: 60,
      });
      fabricCanvas.add(circle);
      fabricCanvas.setActiveObject(circle);
      setActiveTool("select");
    } else if (tool === "text") {
      const text = new Textbox("Double click to edit", {
        left: 100,
        top: 100,
        fill: strokeColor,
        fontSize: 20,
        width: 200,
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      setActiveTool("select");
    } else if (tool === "sticky") {
      addStickyNote("");
    } else if (tool === "idea") {
      addStickyNote("💡 Idea: ");
    } else if (tool === "task") {
      addStickyNote("☐ Task: ");
    } else if (tool === "question") {
      addStickyNote("❓ Question: ");
    } else if (tool === "warning") {
      addStickyNote("⚠️ Note: ");
    } else if (tool === "mindmap") {
      if (!mindMapMode) {
        setMindMapMode(true);
        createMindMapTemplate(fabricCanvas);
        toast.success("Mind map mode enabled! Press Tab to add child nodes.");
      }
      setActiveTool("select");
    }
  };

  const addStickyNote = (prefix: string) => {
    if (!fabricCanvas) return;

    const stickyColor = STICKY_COLORS[stickyColorIndex];
    setStickyColorIndex((prev) => (prev + 1) % STICKY_COLORS.length);

    // Create sticky note background
    const stickyBg = new Rect({
      left: 100 + Math.random() * 200,
      top: 100 + Math.random() * 200,
      fill: stickyColor.bg,
      stroke: stickyColor.border,
      strokeWidth: 1,
      width: 180,
      height: 120,
      rx: 4,
      ry: 4,
      shadow: {
        color: "rgba(0,0,0,0.15)",
        blur: 8,
        offsetX: 2,
        offsetY: 4,
      } as any,
    });

    // Create text on sticky note
    const stickyText = new Textbox(prefix + "Double click to edit", {
      left: stickyBg.left! + 10,
      top: stickyBg.top! + 10,
      fill: "#374151",
      fontSize: 14,
      width: 160,
      fontFamily: "system-ui, sans-serif",
    });

    fabricCanvas.add(stickyBg);
    fabricCanvas.add(stickyText);
    fabricCanvas.setActiveObject(stickyText);
    setActiveTool("select");
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save your whiteboard");
      return;
    }

    if (!fabricCanvas) return;

    setSaving(true);

    try {
      const objects = fabricCanvas.getObjects();
      if (objects.length === 0) {
        toast.error("Canvas is empty");
        setSaving(false);
        return;
      }

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      objects.forEach((obj) => {
        const bound = obj.getBoundingRect();
        minX = Math.min(minX, bound.left);
        minY = Math.min(minY, bound.top);
        maxX = Math.max(maxX, bound.left + bound.width);
        maxY = Math.max(maxY, bound.top + bound.height);
      });

      const padding = 20;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;
      const maxWidth = 800;
      const multiplier = width > maxWidth ? maxWidth / width : 1;

      const dataURL = fabricCanvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: multiplier,
        left: minX - padding,
        top: minY - padding,
        width: width,
        height: height,
      });

      const response = await fetch(dataURL);
      const blob = await response.blob();

      const fileName = `${user.id}/${Date.now()}-whiteboard.png`;
      const { error: uploadError } = await supabase.storage
        .from("diagrams")
        .upload(fileName, blob, { contentType: "image/png", upsert: false });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("diagrams").getPublicUrl(fileName);
      const canvasJSON = JSON.stringify(fabricCanvas.toJSON());

      if (currentDiagramId) {
        const { error } = await supabase
          .from("diagrams")
          .update({
            title: whiteboardTitle,
            content: canvasJSON,
            image_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentDiagramId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("diagrams")
          .insert({
            title: whiteboardTitle,
            content: canvasJSON,
            diagram_type: "whiteboard",
            image_url: publicUrl,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setCurrentDiagramId(data.id);
      }

      toast.success("Whiteboard saved successfully!");
      onSave?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (format: "png" | "pdf" = "png") => {
    if (!fabricCanvas) return;

    const objects = fabricCanvas.getObjects();
    if (objects.length === 0) {
      toast.error("Canvas is empty");
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    objects.forEach((obj) => {
      const bound = obj.getBoundingRect();
      minX = Math.min(minX, bound.left);
      minY = Math.min(minY, bound.top);
      maxX = Math.max(maxX, bound.left + bound.width);
      maxY = Math.max(maxY, bound.top + bound.height);
    });

    const padding = 20;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const dataURL = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
      left: minX - padding,
      top: minY - padding,
      width: width,
      height: height,
    });

    if (format === "pdf") {
      const pdf = new jsPDF({
        orientation: width > height ? "landscape" : "portrait",
        unit: "px",
        format: [width, height],
      });
      pdf.addImage(dataURL, "PNG", 0, 0, width, height);
      pdf.save(`whiteboard-${Date.now()}.pdf`);
      toast.success("Whiteboard exported as PDF!");
    } else {
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `whiteboard-${Date.now()}.png`;
      link.click();
      toast.success("Whiteboard downloaded!");
    }
  };

  const handleGroup = () => {
    if (fabricCanvas) {
      groupSelectedObjects(fabricCanvas);
      saveState();
    }
  };

  const handleUngroup = () => {
    if (fabricCanvas) {
      ungroupSelectedObject(fabricCanvas);
      saveState();
    }
  };

  const handleAddChildNode = () => {
    if (!fabricCanvas || !mindMapMode) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject as any).mindMapData) {
      addChildNode(fabricCanvas, activeObject as Group, "New Node");
      saveState();
    } else {
      toast.error("Select a mind map node first");
    }
  };

  // Removed unused _handleCreateStickyGroup

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/30 relative">
      {/* Collaborator Cursors */}
      <CollaboratorCursors collaborators={collaborators} />
      
      {/* History Panel */}
      <HistoryPanel
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        history={history}
        currentStep={historyStep}
        onJumpToStep={jumpToStep}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Floating Title Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-background border border-border rounded-lg shadow-sm px-4 py-2">
          <Input
            value={whiteboardTitle}
            onChange={(e) => setWhiteboardTitle(e.target.value)}
            placeholder="Whiteboard title..."
            className="text-center font-medium border-none shadow-none px-2 focus-visible:ring-0 bg-transparent min-w-[200px]"
          />
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {/* Undo/Redo */}
        <div className="flex gap-1 bg-background border border-border rounded-lg p-1 shadow-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              >
                <History className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>History</TooltipContent>
          </Tooltip>
        </div>

        {/* Collaboration & Grouping */}
        <div className="flex gap-1 bg-background border border-border rounded-lg p-1 shadow-sm">
          {/* Collaboration indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}
              >
                <Users className="w-4 h-4" />
                {collaborators.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {collaborators.length}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isConnected 
                ? `${collaborators.length + 1} collaborator${collaborators.length > 0 ? 's' : ''} online`
                : 'Not connected'}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleGroup}
              >
                <Link2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Group (Ctrl+G)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleUngroup}
              >
                <Unlink className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ungroup (Ctrl+Shift+G)</TooltipContent>
          </Tooltip>
        </div>

        {user && (
          <Button onClick={handleSave} disabled={saving} size="sm" className="shadow-sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
        <Button onClick={() => handleDownload("png")} variant="outline" size="sm" className="shadow-sm bg-background">
          <Download className="w-4 h-4 mr-2" />
          PNG
        </Button>
        <Button onClick={() => handleDownload("pdf")} variant="outline" size="sm" className="shadow-sm bg-background">
          <FileDown className="w-4 h-4 mr-2" />
          PDF
        </Button>
      </div>

      {/* Floating Toolbar - Left Side */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-background border border-border rounded-xl shadow-lg p-2 flex flex-col gap-1">
          {/* Drawing Tools */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === "draw" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("draw")}
              >
                <Pencil className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Draw</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === "rectangle" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("rectangle")}
              >
                <Square className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Rectangle</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === "circle" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("circle")}
              >
                <CircleIcon className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Circle</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === "text" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("text")}
              >
                <Type className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Text</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === "eraser" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("eraser")}
              >
                <Eraser className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Eraser</TooltipContent>
          </Tooltip>

          {/* Separator */}
          <div className="h-px bg-border my-2" />

          {/* Brainstorming Tools */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === "sticky" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("sticky")}
              >
                <StickyNote className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sticky Note</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === "idea" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("idea")}
              >
                <Lightbulb className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Idea Note</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === "task" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("task")}
              >
                <CheckSquare className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Task Note</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === "question" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("question")}
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Question Note</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === "warning" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("warning")}
              >
                <AlertCircle className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Warning Note</TooltipContent>
          </Tooltip>

          {/* Separator */}
          <div className="h-px bg-border my-2" />

          {/* Mind Map Tool */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={mindMapMode ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => handleToolClick("mindmap")}
              >
                <GitBranch className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Mind Map (Tab to add nodes)</TooltipContent>
          </Tooltip>
          {mindMapMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={handleAddChildNode}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add Child Node</TooltipContent>
            </Tooltip>
          )}

          {/* Separator */}
          <div className="h-px bg-border my-2" />

          {/* Colors */}
          {COLORS.map((color) => (
            <Tooltip key={color}>
              <TooltipTrigger asChild>
                <button
                  className={`h-8 w-8 rounded-md mx-auto transition-transform ${
                    strokeColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setStrokeColor(color)}
                />
              </TooltipTrigger>
              <TooltipContent side="right">
                {color === "#000000" ? "Black" : 
                 color === "#3B82F6" ? "Blue" :
                 color === "#EF4444" ? "Red" :
                 color === "#22C55E" ? "Green" :
                 color === "#F59E0B" ? "Orange" : "Purple"}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="flex-1 relative">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
