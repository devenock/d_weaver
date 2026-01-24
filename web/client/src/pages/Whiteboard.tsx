import { useEffect, useRef, useState } from "react";
import {
  Canvas as FabricCanvas,
  PencilBrush,
  Circle,
  Rect,
  Line,
  Triangle,
  Polygon,
  Textbox,
  FabricImage,
} from "fabric";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Pencil,
  Square,
  Circle as CircleIcon,
  Minus,
  MousePointer,
  Trash2,
  Save,
  Download,
  Triangle as TriangleIcon,
  Pentagon,
  Type,
  Star,
  Eraser,
  Undo,
  Redo,
  FileDown,
  Github,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import { ExportEmbedDialog } from "@/components/ExportEmbedDialog";

const Whiteboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<
    | "select"
    | "draw"
    | "eraser"
    | "rectangle"
    | "circle"
    | "line"
    | "triangle"
    | "hexagon"
    | "text"
    | "star"
  >("select");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [eraserSize, setEraserSize] = useState(20);
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const historyStepRef = useRef(0);
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load diagram if diagramId is in URL
  useEffect(() => {
    const loadDiagram = async () => {
      const id = searchParams.get("diagramId");
      if (!id || !fabricCanvas) return;

      try {
        const { data, error } = await supabase
          .from("diagrams")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (data.content && data.content !== "whiteboard") {
          const canvasData = JSON.parse(data.content);
          await fabricCanvas.loadFromJSON(canvasData);
          fabricCanvas.renderAll();
          setDiagramId(id);
          toast.success("Diagram loaded for editing!");
        }
      } catch (error: any) {
        toast.error("Failed to load diagram: " + error.message);
      }
    };

    loadDiagram();
  }, [searchParams, fabricCanvas]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 700,
      backgroundColor: "#ffffff",
    });

    // Enable drag and drop for images
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

    // Initialize brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = strokeColor;
    canvas.freeDrawingBrush.width = 2;

    // Save initial state to history
    const initialState = JSON.stringify(canvas.toJSON());
    setHistory([initialState]);
    setHistoryStep(0);
    historyStepRef.current = 0;

    // Track canvas changes for undo/redo
    const saveState = () => {
      const json = JSON.stringify(canvas.toJSON());
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyStepRef.current + 1);
        newHistory.push(json);
        historyStepRef.current = historyStepRef.current + 1;
        return newHistory;
      });
      setHistoryStep(historyStepRef.current);
    };

    canvas.on("object:added", saveState);
    canvas.on("object:modified", saveState);
    canvas.on("object:removed", saveState);

    setFabricCanvas(canvas);
    toast.success("Whiteboard ready!");

    return () => {
      const canvasElement = canvasRef.current;
      if (canvasElement) {
        canvasElement.removeEventListener("dragover", handleDragOver);
        canvasElement.removeEventListener("drop", handleDrop);
      }
      canvas.off("object:added", saveState);
      canvas.off("object:modified", saveState);
      canvas.off("object:removed", saveState);
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode =
      activeTool === "draw" || activeTool === "eraser";

    if (fabricCanvas.freeDrawingBrush) {
      if (activeTool === "eraser") {
        fabricCanvas.freeDrawingBrush.color = "#ffffff";
        fabricCanvas.freeDrawingBrush.width = eraserSize;
      } else if (activeTool === "draw") {
        fabricCanvas.freeDrawingBrush.color = strokeColor;
        fabricCanvas.freeDrawingBrush.width = 2;
      }
    }
  }, [activeTool, strokeColor, eraserSize, fabricCanvas]);

  const handleUndo = async () => {
    if (!fabricCanvas || historyStep === 0) return;

    const newStep = historyStep - 1;
    const prevState = history[newStep];

    if (prevState) {
      await fabricCanvas.loadFromJSON(JSON.parse(prevState));
      fabricCanvas.renderAll();
      setHistoryStep(newStep);
      historyStepRef.current = newStep;
    }
  };

  const handleRedo = async () => {
    if (!fabricCanvas || historyStep >= history.length - 1) return;

    const newStep = historyStep + 1;
    const nextState = history[newStep];

    if (nextState) {
      await fabricCanvas.loadFromJSON(JSON.parse(nextState));
      fabricCanvas.renderAll();
      setHistoryStep(newStep);
      historyStepRef.current = newStep;
    }
  };

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
    } else if (tool === "line") {
      const line = new Line([50, 100, 200, 100], {
        stroke: strokeColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(line);
      fabricCanvas.setActiveObject(line);
    } else if (tool === "triangle") {
      const triangle = new Triangle({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: strokeColor,
        strokeWidth: 2,
        width: 100,
        height: 100,
      });
      fabricCanvas.add(triangle);
      fabricCanvas.setActiveObject(triangle);
    } else if (tool === "hexagon") {
      const hexagon = new Polygon(
        [
          { x: 50, y: 0 },
          { x: 100, y: 25 },
          { x: 100, y: 75 },
          { x: 50, y: 100 },
          { x: 0, y: 75 },
          { x: 0, y: 25 },
        ],
        {
          left: 100,
          top: 100,
          fill: "transparent",
          stroke: strokeColor,
          strokeWidth: 2,
        },
      );
      fabricCanvas.add(hexagon);
      fabricCanvas.setActiveObject(hexagon);
    } else if (tool === "star") {
      const points = [];
      const outerRadius = 50;
      const innerRadius = 25;
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        points.push({
          x: 50 + radius * Math.cos(angle),
          y: 50 + radius * Math.sin(angle),
        });
      }
      const star = new Polygon(points, {
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: strokeColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(star);
      fabricCanvas.setActiveObject(star);
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
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    toast.success("Canvas cleared!");
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save your whiteboard");
      navigate("/login", { replace: true });
      return;
    }

    if (!fabricCanvas) return;

    setSaving(true);

    try {
      // Calculate bounding box of all objects to capture entire drawing
      const objects = fabricCanvas.getObjects();
      if (objects.length === 0) {
        toast.error("Canvas is empty");
        setSaving(false);
        return;
      }

      // Removed unused _group
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

      // Calculate multiplier to fit nicely in gallery (max width 800px)
      const maxWidth = 800;
      const multiplier = width > maxWidth ? maxWidth / width : 1;

      // Export canvas with calculated dimensions
      const dataURL = fabricCanvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: multiplier,
        left: minX - padding,
        top: minY - padding,
        width: width,
        height: height,
      });

      // Convert data URL to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}-whiteboard.png`;
      const { error: uploadError } = await supabase.storage
        .from("diagrams")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("diagrams").getPublicUrl(fileName);

      setSavedImageUrl(publicUrl);

      // Get canvas JSON for editing later
      const canvasJSON = JSON.stringify(fabricCanvas.toJSON());

      // Save to database (update if editing existing diagram, insert if new)
      if (diagramId) {
        const { error } = await supabase
          .from("diagrams")
          .update({
            content: canvasJSON,
            image_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", diagramId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("diagrams").insert({
          title: `Whiteboard ${new Date().toLocaleDateString()}`,
          content: canvasJSON,
          diagram_type: "whiteboard",
          image_url: publicUrl,
          user_id: user.id,
        });

        if (error) throw error;
      }

      toast.success("Whiteboard saved successfully!");
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Whiteboard</h1>
            <div className="flex gap-2">
              {user && savedImageUrl && (
                <Button
                  onClick={() => setExportDialogOpen(true)}
                  variant="outline"
                >
                  <Github className="w-4 h-4 mr-2" />
                  README
                </Button>
              )}
              {user && (
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              )}
              <Button onClick={() => handleDownload("png")} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                PNG
              </Button>
              <Button onClick={() => handleDownload("pdf")} variant="outline">
                <FileDown className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          <Card className="p-6">
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={historyStep === 0}
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRedo}
                    disabled={historyStep >= history.length - 1}
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>
                <div className="w-px h-8 bg-border" />
                <Button
                  variant={activeTool === "select" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick("select")}
                >
                  <MousePointer className="w-4 h-4 mr-2" />
                  Select
                </Button>
                <Button
                  variant={activeTool === "draw" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick("draw")}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Draw
                </Button>
                <Button
                  variant={activeTool === "eraser" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick("eraser")}
                >
                  <Eraser className="w-4 h-4 mr-2" />
                  Eraser
                </Button>
                {activeTool === "eraser" && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Size:</label>
                    <Slider
                      value={[eraserSize]}
                      onValueChange={(values) => setEraserSize(values[0])}
                      min={5}
                      max={50}
                      step={5}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground w-8">
                      {eraserSize}
                    </span>
                  </div>
                )}
                <Button
                  variant={activeTool === "rectangle" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick("rectangle")}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Rectangle
                </Button>
                <Button
                  variant={activeTool === "circle" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick("circle")}
                >
                  <CircleIcon className="w-4 h-4 mr-2" />
                  Circle
                </Button>
                <Button
                  variant={activeTool === "line" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick("line")}
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Line
                </Button>
                <Button
                  variant={activeTool === "triangle" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick("triangle")}
                >
                  <TriangleIcon className="w-4 h-4 mr-2" />
                  Triangle
                </Button>
                <Button
                  variant={activeTool === "hexagon" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick("hexagon")}
                >
                  <Pentagon className="w-4 h-4 mr-2" />
                  Hexagon
                </Button>
                <Button
                  variant={activeTool === "star" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick("star")}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Star
                </Button>
                <Button
                  variant={activeTool === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick("text")}
                >
                  <Type className="w-4 h-4 mr-2" />
                  Text
                </Button>
                <div className="flex items-center gap-2 ml-4">
                  <label className="text-sm font-medium">Color:</label>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClear}
                  className="ml-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>

              {/* Canvas */}
              <div className="border border-border rounded-lg overflow-auto bg-white relative">
                <canvas ref={canvasRef} />
                <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                  Drag & drop images here
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {savedImageUrl && (
        <ExportEmbedDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          imageUrl={savedImageUrl}
          title="Whiteboard Diagram"
        />
      )}
    </div>
  );
};

export default Whiteboard;
