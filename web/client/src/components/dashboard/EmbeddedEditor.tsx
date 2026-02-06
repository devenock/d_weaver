import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MousePointer,
  Square,
  Circle as CircleIcon,
  Type,
  Database,
  Server,
  Cloud,
  MessageSquare,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Save,
  Download,
  X,
  Send,
  ChevronDown,
  ChevronRight,
  Lock,
  Settings,
  Zap,
  Monitor,
  Smartphone,
  Globe,
  Trash2,
  Copy,
  Layers,
  Grid3X3,
  Box,
  Hexagon,
  Triangle,
  Diamond,
  Star,
  Pentagon,
  Octagon,
  FileText,
  Folder,
  Shield,
  HardDrive,
  Cpu,
  Router,
  Spline,
  PenTool,
  Bold,
  Italic,
  Group,
  Ungroup,
  Menu,
  History,
  Search,
  Keyboard,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { ApiUser } from "@/lib/auth-api";
import { getDiagram, createDiagram, updateDiagram, uploadDiagramImage, listComments, addComment } from "@/lib/diagram-api";
import { getApiErrorMessage } from "@/lib/api";
import type { CommentResponse } from "@/lib/api-types";
import { Canvas as FabricCanvas, Rect, Circle, Textbox, Polygon, Path, FabricObject, Group as FabricGroup, FabricImage, ActiveSelection } from "fabric";
import { LayersPanel } from "./editor/LayersPanel";
import { AlignmentTools } from "./editor/AlignmentTools";
import { HistoryPanel } from "./editor/HistoryPanel";
import { useSmartGuides } from "./editor/SmartGuides";
import { KeyboardShortcutsPanel } from "./editor/KeyboardShortcutsPanel";
import { createFabricConnector, updateConnectorPath } from "./editor/CurvedConnector";
import type { ConnectorStyle, ArrowStyle } from "./editor/CurvedConnector";
import { createIconDataUrl } from "./editor/ShapeRenderer";
import mermaid from "mermaid";

interface EmbeddedEditorProps {
  diagramId?: string | null;
  user: ApiUser | null;
  onClose: () => void;
  onSave?: () => void;
  workspaceId?: string;
  onRequestNew?: () => void;
}

type Tool = "select" | "rectangle" | "circle" | "arrow" | "line" | "text" | "connector";

type ShapeType = "rect" | "roundedRect" | "circle" | "triangle" | "diamond" | "hexagon" | "pentagon" | "octagon" | "star" | "parallelogram" | "server" | "database" | "cloud" | "api" | "security" | "config" | "desktop" | "mobile" | "web" | "document" | "folder" | "shield" | "storage" | "cpu" | "router";

interface ShapePreset {
  id: ShapeType;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}

interface ShapeCategory {
  name: string;
  icon: React.ReactNode;
  shapes: ShapePreset[];
}

const SHAPE_CATEGORIES: ShapeCategory[] = [
  {
    name: "Basic Shapes",
    icon: <Grid3X3 className="h-4 w-4" />,
    shapes: [
      { id: "rect", label: "Rectangle", icon: Square, color: "#6366F1" },
      { id: "roundedRect", label: "Rounded", icon: Box, color: "#8B5CF6" },
      { id: "circle", label: "Circle", icon: CircleIcon, color: "#EC4899" },
      { id: "triangle", label: "Triangle", icon: Triangle, color: "#EF4444" },
      { id: "diamond", label: "Diamond", icon: Diamond, color: "#14B8A6" },
      { id: "hexagon", label: "Hexagon", icon: Hexagon, color: "#F59E0B" },
      { id: "pentagon", label: "Pentagon", icon: Pentagon, color: "#22C55E" },
      { id: "octagon", label: "Octagon", icon: Octagon, color: "#3B82F6" },
      { id: "star", label: "Star", icon: Star, color: "#F97316" },
      { id: "parallelogram", label: "Parallel", icon: PenTool, color: "#A855F7" },
    ],
  },
  {
    name: "Cloud & Infrastructure",
    icon: <Cloud className="h-4 w-4" />,
    shapes: [
      { id: "server", label: "Server", icon: Server, color: "#3B82F6" },
      { id: "database", label: "Database", icon: Database, color: "#22C55E" },
      { id: "cloud", label: "Cloud", icon: Cloud, color: "#6366F1" },
      { id: "api", label: "API Gateway", icon: Zap, color: "#F59E0B" },
      { id: "cpu", label: "CPU", icon: Cpu, color: "#8B5CF6" },
      { id: "router", label: "Router", icon: Router, color: "#14B8A6" },
      { id: "storage", label: "Storage", icon: HardDrive, color: "#64748B" },
    ],
  },
  {
    name: "Security",
    icon: <Shield className="h-4 w-4" />,
    shapes: [
      { id: "security", label: "Lock", icon: Lock, color: "#EF4444" },
      { id: "shield", label: "Shield", icon: Shield, color: "#F59E0B" },
      { id: "config", label: "Config", icon: Settings, color: "#6B7280" },
    ],
  },
  {
    name: "Devices",
    icon: <Monitor className="h-4 w-4" />,
    shapes: [
      { id: "desktop", label: "Desktop", icon: Monitor, color: "#1F2937" },
      { id: "mobile", label: "Mobile", icon: Smartphone, color: "#374151" },
      { id: "web", label: "Web App", icon: Globe, color: "#2563EB" },
    ],
  },
  {
    name: "Documents",
    icon: <FileText className="h-4 w-4" />,
    shapes: [
      { id: "document", label: "Document", icon: FileText, color: "#6366F1" },
      { id: "folder", label: "Folder", icon: Folder, color: "#F59E0B" },
    ],
  },
];

// Shape types that should render with icons
const ICON_SHAPE_TYPES = ['server', 'database', 'cloud', 'api', 'cpu', 'router', 'storage', 'security', 'shield', 'config', 'desktop', 'mobile', 'web', 'document', 'folder'];

const FONT_FAMILIES = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Courier New, monospace", label: "Courier" },
  { value: "Times New Roman, serif", label: "Times" },
];

export function EmbeddedEditor({ diagramId, user, onClose: _onClose, onSave, workspaceId, onRequestNew }: EmbeddedEditorProps) {
  const { getAccessToken } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [diagramTitle, setDiagramTitle] = useState("Untitled Diagram");
  const [saving, setSaving] = useState(false);
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(diagramId || null);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShapesPanel, setShowShapesPanel] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const historyStepRef = useRef(0);
  const [_hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Selection & Properties
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [fillColor, setFillColor] = useState("#6366F1");
  const [strokeColor, setStrokeColor] = useState("#4338CA");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [objectLabel, setObjectLabel] = useState("");
  const [labelFontSize, setLabelFontSize] = useState(14);
  const [_labelColor, _setLabelColor] = useState("#ffffff");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");

  // Connector settings
  const [connectorStyle, setConnectorStyle] = useState<ConnectorStyle>("curved");
  const [arrowStyle, setArrowStyle] = useState<ArrowStyle>("end");

  // Categories
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Basic Shapes", "Cloud & Infrastructure"]);

  // Drag state (sidebar -> canvas)
  const [draggedShape, setDraggedShape] = useState<ShapePreset | null>(null);

  // Connector state
  const [connectorStart, setConnectorStart] = useState<{ obj: FabricObject; x: number; y: number } | null>(null);

  // Shape search
  const [shapeSearchQuery, setShapeSearchQuery] = useState("");

  // Smart guides enabled
  const [smartGuidesEnabled, _setSmartGuidesEnabled] = useState(true);

  // Keyboard shortcuts panel
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Mermaid diagram (when content is mermaid code, not Fabric JSON)
  const [mermaidContent, setMermaidContent] = useState<string | null>(null);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);

  // Track changes
  const markChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    if (fabricCanvasRef.current) return;

    const container = containerRef.current;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: "transparent",
      selection: true,
      preserveObjectStacking: true,
    });

    // Selection: no rectangle wrapper — selected shapes appear exactly as they are
    canvas.selection = true;
    canvas.selectionColor = "transparent";
    canvas.selectionBorderColor = "transparent";
    canvas.selectionLineWidth = 0;

    FabricObject.prototype.hasBorders = false;
    FabricObject.prototype.hasControls = false;
    FabricObject.prototype.transparentCorners = true;
    FabricObject.prototype.selectable = true;
    FabricObject.prototype.evented = true;

    // Grid is drawn on the container via CSS so shapes always render on top

    // Selection events - show properties when object selected
    canvas.on("selection:created", (e) => {
      const obj = e.selected?.[0];
      if (obj) {
        setSelectedObject(obj);
        setShowProperties(true);
        updatePropertiesFromObject(obj);
      }
    });

    canvas.on("selection:updated", (e) => {
      const obj = e.selected?.[0];
      if (obj) {
        setSelectedObject(obj);
        updatePropertiesFromObject(obj);
      }
    });

    canvas.on("selection:cleared", () => {
      setSelectedObject(null);
      setObjectLabel("");
    });

    // Update connectors when objects move
    canvas.on("object:moving", (e) => {
      updateConnectedLines(canvas, e.target);
    });

    const handleResize = () => {
      canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      canvas.renderAll();
    };

    window.addEventListener("resize", handleResize);

    // History tracking
    const initialState = JSON.stringify(canvas.toJSON());
    setHistory([initialState]);
    setHistoryStep(0);
    historyStepRef.current = 0;

    const saveState = () => {
      const json = JSON.stringify(canvas.toJSON());
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyStepRef.current + 1);
        newHistory.push(json);
        historyStepRef.current = historyStepRef.current + 1;
        return newHistory;
      });
      setHistoryStep(historyStepRef.current);
      markChanged();
    };

    canvas.on("object:added", saveState);
    canvas.on("object:modified", saveState);
    canvas.on("object:removed", saveState);

    // Double-click on a shape with a label: enter inline editing for the label
    const handleDblClick = (e: any) => {
      const target = e.target;
      if (!target) return;
      let textObj: Textbox | null = null;
      if (target instanceof FabricGroup) {
        const textChild = target.getObjects().find((o) => o instanceof Textbox);
        textObj = textChild ? (textChild as Textbox) : null;
      } else if (target instanceof Textbox) {
        textObj = target;
      }
      if (textObj && typeof textObj.enterEditing === "function") {
        textObj.enterEditing();
        textObj.hiddenTextarea?.focus();
      }
    };
    canvas.on("mouse:dblclick", handleDblClick);

    fabricCanvasRef.current = canvas;
    setFabricCanvas(canvas);

    canvas.renderAll();

    setTimeout(() => {
      container.focus();
      canvas.renderAll();
    }, 50);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.off("object:added", saveState);
      canvas.off("object:modified", saveState);
      canvas.off("object:removed", saveState);
      canvas.off("mouse:dblclick", handleDblClick);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [markChanged]);

  // Smart guides hook
  useSmartGuides({ fabricCanvas, enabled: smartGuidesEnabled, snapThreshold: 10 });

  // Update properties from selected object
  const updatePropertiesFromObject = (obj: FabricObject) => {
    setFillColor(String((obj as any).fill || "#6366F1"));
    setStrokeColor(String((obj as any).stroke || "#4338CA"));
    setStrokeWidth(Number((obj as any).strokeWidth) || 2);
    setObjectLabel((obj as any).customLabel || "");
    
    // Get text properties if applicable
    if (obj instanceof Textbox) {
      setIsBold((obj as any).fontWeight === 'bold');
      setIsItalic((obj as any).fontStyle === 'italic');
      setFontFamily((obj as any).fontFamily || "Inter, sans-serif");
      setLabelFontSize((obj as any).fontSize || 14);
    } else if ((obj as any).isIconShape || (obj as any).isBasicShape) {
      // For grouped shapes, check internal text
      if (obj instanceof FabricGroup) {
        const textObj = obj.getObjects().find(o => o instanceof Textbox) as Textbox | undefined;
        if (textObj) {
          setIsBold(textObj.fontWeight === 'bold');
          setIsItalic(textObj.fontStyle === 'italic');
          setFontFamily(textObj.fontFamily || "Inter, sans-serif");
          setLabelFontSize(textObj.fontSize || 14);
        }
      }
    }
  };

  // Update connected lines when object moves
  const updateConnectedLines = useCallback((canvas: FabricCanvas, target: FabricObject | undefined) => {
    if (!target) return;
    const targetId = (target as any).shapeId;
    
    canvas.getObjects().forEach((obj) => {
      if ((obj as any).isConnector && obj instanceof Path) {
        const startId = (obj as any).startObjectId;
        const endId = (obj as any).endObjectId;
        
        if (startId === targetId || endId === targetId) {
          const startObj = canvas.getObjects().find((o) => (o as any).shapeId === startId);
          const endObj = canvas.getObjects().find((o) => (o as any).shapeId === endId);
          
          if (startObj && endObj) {
            updateConnectorPath(obj, startObj, endObj);
          }
        }
      }
    });
    canvas.renderAll();
  }, []);

  // Load existing diagram
  useEffect(() => {
    const loadDiagram = async () => {
      if (!diagramId || !fabricCanvas) return;
      const token = getAccessToken();
      if (!token) return;

      try {
        const data = await getDiagram(token, diagramId);
        setDiagramTitle(data.title);
        setCurrentDiagramId(data.id);
        setHasUnsavedChanges(false);

        try {
          const canvasData = JSON.parse(data.content);
          setMermaidContent(null);
          if (canvasData.objects) {
            await fabricCanvas.loadFromJSON(canvasData, async () => {
              const objects = fabricCanvas.getObjects();
              for (const obj of objects) {
                (obj as any).set({ hasBorders: false, hasControls: false });
                if (obj.type === "group") {
                  const grp = obj as FabricGroup;
                  grp.setCoords();
                  const ox = (grp as any).originX ?? "left";
                  const oy = (grp as any).originY ?? "top";
                  if (ox !== "center" || oy !== "center") {
                    const w = (grp as any).width ?? 120;
                    const h = (grp as any).height ?? 80;
                    const currentLeft = grp.left ?? 0;
                    const currentTop = grp.top ?? 0;
                    const topLeftX = ox === "center" ? currentLeft - w / 2 : ox === "right" ? currentLeft - w : currentLeft;
                    const topLeftY = oy === "center" ? currentTop - h / 2 : oy === "bottom" ? currentTop - h : currentTop;
                    grp.set({
                      originX: "center",
                      originY: "center",
                      left: topLeftX + w / 2,
                      top: topLeftY + h / 2,
                    });
                    grp.setCoords();
                  }
                }
                if (obj.type === 'group') {
                  const group = obj as FabricGroup;
                  const groupObjects = group.getObjects();
                  const updatedObjects: FabricObject[] = [];
                    
                  for (const childObj of groupObjects) {
                    if (childObj.type === 'image') {
                      const imgObj = childObj as any;
                      if (imgObj.src && imgObj.src.startsWith('data:image')) {
                        try {
                          const img = await FabricImage.fromURL(imgObj.src);
                          img.set({
                            left: childObj.left || 0,
                            top: childObj.top || 0,
                            scaleX: childObj.scaleX || 1,
                            scaleY: childObj.scaleY || 1,
                            originX: childObj.originX || 'left',
                            originY: childObj.originY || 'top',
                            selectable: false,
                            evented: false,
                          });
                          updatedObjects.push(img);
                        } catch (err) {
                          console.error('Failed to restore image:', err);
                          updatedObjects.push(childObj);
                        }
                      } else {
                        updatedObjects.push(childObj);
                      }
                    } else {
                      updatedObjects.push(childObj);
                    }
                  }
                    
                  if (updatedObjects.length === groupObjects.length) {
                    group.set('objects', updatedObjects);
                  }
                }
              }
              fabricCanvas.renderAll();
            });
          }
        } catch {
          // Content is mermaid code (e.g. from template or AI)
          const trimmed = String(data.content || "").trim();
          if (trimmed.length > 0) {
            setMermaidContent(trimmed);
          }
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Failed to load diagram"));
      }
    };

    loadDiagram();
  }, [diagramId, fabricCanvas, getAccessToken]);

  // Render mermaid when content is mermaid code
  useEffect(() => {
    if (!mermaidContent || !mermaidContainerRef.current) return;
    const container = mermaidContainerRef.current;
    container.innerHTML = "";
    const id = `mermaid-editor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
    mermaid
      .render(id, mermaidContent)
      .then(({ svg }) => {
        if (mermaidContainerRef.current) {
          mermaidContainerRef.current.innerHTML = `<div class="bg-card rounded-xl border shadow-sm p-6 max-w-4xl mx-auto [&_svg]:max-w-full [&_svg]:h-auto">${svg}</div>`;
        }
      })
      .catch((err) => {
        console.error("Mermaid render error:", err);
        if (mermaidContainerRef.current) {
          mermaidContainerRef.current.innerHTML = `<div class="p-4 text-sm text-muted-foreground">Could not render diagram. The content may be invalid Mermaid syntax.</div>`;
        }
      });
  }, [mermaidContent]);

  // Find empty position for new shape
  const findEmptyPosition = useCallback(
    (width: number, height: number) => {
      if (!fabricCanvas) return { left: 200, top: 200 };

      const objects = fabricCanvas.getObjects();
      const gridSize = 20;
      const padding = 20;

      for (let y = 100; y < 600; y += gridSize) {
        for (let x = 100; x < 800; x += gridSize) {
          const testRect = { left: x, top: y, width, height };
          let collision = false;

          for (const obj of objects) {
            const objBounds = obj.getBoundingRect();
            if (
              testRect.left < objBounds.left + objBounds.width + padding &&
              testRect.left + testRect.width + padding > objBounds.left &&
              testRect.top < objBounds.top + objBounds.height + padding &&
              testRect.top + testRect.height + padding > objBounds.top
            ) {
              collision = true;
              break;
            }
          }

          if (!collision) {
            return { left: x, top: y };
          }
        }
      }

      return { left: 200, top: 200 };
    },
    [fabricCanvas]
  );

  // Center group origin so the selection wrapper is centered on the shape (no misalignment)
  const centerGroupOrigin = useCallback((group: FabricGroup, topLeftX: number, topLeftY: number) => {
    group.setCoords();
    const w = (group as any).width ?? 120;
    const h = (group as any).height ?? 80;
    group.set({
      originX: "center",
      originY: "center",
      left: topLeftX + w / 2,
      top: topLeftY + h / 2,
    });
    group.setCoords();
  }, []);

  // Create shape based on type - all shapes now grouped with text
  const createShape = useCallback(async (shapeType: ShapeType, color: string, left: number, top: number, label: string): Promise<FabricObject> => {
    const baseProps = {
      fill: color,
      stroke: "#1E40AF",
      strokeWidth: 2,
    };

    const shapeId = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const shapeWidth = 120;
    const shapeHeight = 80;

    // Check if this is an icon-based shape
    if (ICON_SHAPE_TYPES.includes(shapeType)) {
      // Create a rounded rectangle as background at group origin (0,0)
      const bgRect = new Rect({
        left: 0,
        top: 0,
        width: shapeWidth,
        height: shapeHeight,
        rx: 12,
        ry: 12,
        ...baseProps,
      });

      // Load the icon image
      const iconDataUrl = createIconDataUrl(shapeType, '#ffffff', 40);
      
      if (!iconDataUrl) {
        console.error(`Failed to create icon data URL for shape type: ${shapeType}`);
        // Fallback to simple rect if icon creation fails
        const rect = new Rect({ left, top, width: shapeWidth, height: shapeHeight, rx: 12, ry: 12, ...baseProps });
        (rect as any).shapeId = shapeId;
        (rect as any).shapeType = shapeType;
        return rect;
      }
      
      try {
        // Load the image - FabricImage.fromURL returns a promise in newer versions
        const img = await FabricImage.fromURL(iconDataUrl, {
          crossOrigin: 'anonymous',
        });
        
        // Scale the image first
        img.scaleToWidth(32);
        img.scaleToHeight(32);
        
        // Wait for image to be fully loaded and scaled
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Get the actual scaled dimensions
        const scaledWidth = (img.width || 32) * (img.scaleX || 1);
        const scaledHeight = (img.height || 32) * (img.scaleY || 1);
        
        // Position image at center of the shape
        // In a FabricGroup, objects use coordinates relative to the group's top-left (0,0)
        // The background rect is at (0,0) with width 120, height 80
        // We want the icon centered horizontally and slightly above vertical center
        const iconCenterX = shapeWidth / 2; // 60 (center of 120px width)
        const iconCenterY = shapeHeight / 2 - 8; // 32 (slightly above center of 80px height)
        
        // Use left/top origin and calculate position manually to ensure accuracy
        // Position = center - half of scaled dimension
        const iconLeft = iconCenterX - (scaledWidth / 2);
        const iconTop = iconCenterY - (scaledHeight / 2);
        
        img.set({
          left: iconLeft,
          top: iconTop,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
          excludeFromExport: false,
        });
        
        // Ensure image is rendered and coordinates are updated
        img.setCoords();
        
        // Debug log
        console.log('Icon positioned with left/top origin:', {
          iconCenterX,
          iconCenterY,
          scaledWidth,
          scaledHeight,
          iconLeft,
          iconTop,
          imgLeft: img.left,
          imgTop: img.top,
        });
        
        // Verify image is loaded and has dimensions
        if (!img.getElement || !img.getElement()) {
          throw new Error('Image element not available');
        }

        // Create label text centered in the shape
        const labelText = new Textbox(label, {
          fontSize: 11,
          fill: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'bold',
          originX: 'center',
          originY: 'center',
          textAlign: 'center',
          width: shapeWidth - 10,
          left: shapeWidth / 2,
          top: shapeHeight / 2,
          selectable: false,
          evented: false,
        });

        // Group them together - order matters: background first, then image, then text
        // All objects in the group use coordinates relative to the group's origin (0,0)
        const group = new FabricGroup([bgRect, img, labelText], {
          left,
          top,
        });

        // After grouping, verify and fix image position if needed
        group.setCoords();
        group.setCoords();
        
        // Get the image from the group and verify its position
        const groupObjects = group.getObjects();
        const imageInGroup = groupObjects.find(obj => obj.type === 'image') as FabricImage;
        if (imageInGroup) {
          // If the image position seems wrong, fix it
          const expectedCenterX = shapeWidth / 2;
          const expectedCenterY = shapeHeight / 2 - 8;
          
          // Check if position is way off (more than 10px difference)
          if (Math.abs(imageInGroup.left - expectedCenterX) > 10 || 
              Math.abs(imageInGroup.top - expectedCenterY) > 10) {
            console.warn('Image position incorrect, fixing...', {
              current: { left: imageInGroup.left, top: imageInGroup.top },
              expected: { left: expectedCenterX, top: expectedCenterY },
            });
            
            // Fix the position
            imageInGroup.set({
              left: expectedCenterX,
              top: expectedCenterY,
              originX: 'center',
              originY: 'center',
            });
            
            // Update the group
            group.setCoords();
            group.setCoords();
          }
        }

        centerGroupOrigin(group, left, top);

        (group as any).shapeId = shapeId;
        (group as any).shapeType = shapeType;
        (group as any).customLabel = label;
        (group as any).isIconShape = true;

        return group;
      } catch (error) {
        console.error('Failed to create icon shape:', error);
        // Fallback to simple rect if image fails
        const rect = new Rect({ left, top, width: shapeWidth, height: shapeHeight, rx: 12, ry: 12, ...baseProps });
        (rect as any).shapeId = shapeId;
        (rect as any).shapeType = shapeType;
        return rect;
      }
    } else {
      // Handle geometric shapes - now as groups with text inside
      let shapeObj: FabricObject;
      
      switch (shapeType) {
        case "circle": {
          const circleRadius = 50;
          shapeObj = new Circle({ 
            radius: circleRadius, 
            left: 0, 
            top: 0,
            originX: 'center',
            originY: 'center',
            ...baseProps 
          });
          
          const labelText = new Textbox(label, {
            fontSize: 12,
            fill: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            width: circleRadius * 1.5,
            left: 0,
            top: 0,
          });

          const group = new FabricGroup([shapeObj, labelText], { left, top });
          centerGroupOrigin(group, left, top);
          (group as any).shapeId = shapeId;
          (group as any).shapeType = shapeType;
          (group as any).customLabel = label;
          (group as any).isBasicShape = true;
          return group;
        }

        case "triangle": {
          const triPoints = [
            { x: 60, y: 0 },
            { x: 120, y: 100 },
            { x: 0, y: 100 },
          ];
          shapeObj = new Polygon(triPoints, { left: 0, top: 0, ...baseProps });
          
          const labelText = new Textbox(label, {
            fontSize: 12,
            fill: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            width: 80,
            left: 60,
            top: 60,
          });

          const group = new FabricGroup([shapeObj, labelText], { left, top });
          centerGroupOrigin(group, left, top);
          (group as any).shapeId = shapeId;
          (group as any).shapeType = shapeType;
          (group as any).customLabel = label;
          (group as any).isBasicShape = true;
          return group;
        }

        case "diamond": {
          const diamondPoints = [
            { x: 60, y: 0 },
            { x: 120, y: 50 },
            { x: 60, y: 100 },
            { x: 0, y: 50 },
          ];
          shapeObj = new Polygon(diamondPoints, { left: 0, top: 0, ...baseProps });
          
          const labelText = new Textbox(label, {
            fontSize: 11,
            fill: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            width: 80,
            left: 60,
            top: 50,
          });

          const group = new FabricGroup([shapeObj, labelText], { left, top });
          centerGroupOrigin(group, left, top);
          (group as any).shapeId = shapeId;
          (group as any).shapeType = shapeType;
          (group as any).customLabel = label;
          (group as any).isBasicShape = true;
          return group;
        }

        case "hexagon": {
          const hexPoints = [];
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            hexPoints.push({ x: 50 + 50 * Math.cos(angle), y: 50 + 50 * Math.sin(angle) });
          }
          shapeObj = new Polygon(hexPoints, { left: 0, top: 0, ...baseProps });
          
          const labelText = new Textbox(label, {
            fontSize: 11,
            fill: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            width: 70,
            left: 50,
            top: 50,
          });

          const group = new FabricGroup([shapeObj, labelText], { left, top });
          centerGroupOrigin(group, left, top);
          (group as any).shapeId = shapeId;
          (group as any).shapeType = shapeType;
          (group as any).customLabel = label;
          (group as any).isBasicShape = true;
          return group;
        }

        case "pentagon": {
          const pentPoints = [];
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
            pentPoints.push({ x: 50 + 50 * Math.cos(angle), y: 50 + 50 * Math.sin(angle) });
          }
          shapeObj = new Polygon(pentPoints, { left: 0, top: 0, ...baseProps });
          
          const labelText = new Textbox(label, {
            fontSize: 11,
            fill: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            width: 70,
            left: 50,
            top: 50,
          });

          const group = new FabricGroup([shapeObj, labelText], { left, top });
          centerGroupOrigin(group, left, top);
          (group as any).shapeId = shapeId;
          (group as any).shapeType = shapeType;
          (group as any).customLabel = label;
          (group as any).isBasicShape = true;
          return group;
        }

        case "octagon": {
          const octPoints = [];
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i - Math.PI / 8;
            octPoints.push({ x: 50 + 50 * Math.cos(angle), y: 50 + 50 * Math.sin(angle) });
          }
          shapeObj = new Polygon(octPoints, { left: 0, top: 0, ...baseProps });
          
          const labelText = new Textbox(label, {
            fontSize: 11,
            fill: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            width: 70,
            left: 50,
            top: 50,
          });

          const group = new FabricGroup([shapeObj, labelText], { left, top });
          centerGroupOrigin(group, left, top);
          (group as any).shapeId = shapeId;
          (group as any).shapeType = shapeType;
          (group as any).customLabel = label;
          (group as any).isBasicShape = true;
          return group;
        }

        case "star": {
          const starPoints = [];
          for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? 50 : 25;
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            starPoints.push({ x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) });
          }
          shapeObj = new Polygon(starPoints, { left: 0, top: 0, ...baseProps });
          
          const labelText = new Textbox(label, {
            fontSize: 10,
            fill: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            width: 50,
            left: 50,
            top: 50,
          });

          const group = new FabricGroup([shapeObj, labelText], { left, top });
          centerGroupOrigin(group, left, top);
          (group as any).shapeId = shapeId;
          (group as any).shapeType = shapeType;
          (group as any).customLabel = label;
          (group as any).isBasicShape = true;
          return group;
        }

        case "parallelogram": {
          const paraPoints = [
            { x: 25, y: 0 },
            { x: 120, y: 0 },
            { x: 95, y: 60 },
            { x: 0, y: 60 },
          ];
          shapeObj = new Polygon(paraPoints, { left: 0, top: 0, ...baseProps });
          
          const labelText = new Textbox(label, {
            fontSize: 11,
            fill: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            width: 80,
            left: 60,
            top: 30,
          });

          const group = new FabricGroup([shapeObj, labelText], { left, top });
          centerGroupOrigin(group, left, top);
          (group as any).shapeId = shapeId;
          (group as any).shapeType = shapeType;
          (group as any).customLabel = label;
          (group as any).isBasicShape = true;
          return group;
        }

        case "roundedRect": {
          shapeObj = new Rect({ left: 0, top: 0, width: 120, height: 80, rx: 16, ry: 16, ...baseProps });
          
          const labelText = new Textbox(label, {
            fontSize: 12,
            fill: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            width: 100,
            left: 60,
            top: 40,
          });

          const group = new FabricGroup([shapeObj, labelText], { left, top });
          centerGroupOrigin(group, left, top);
          (group as any).shapeId = shapeId;
          (group as any).shapeType = shapeType;
          (group as any).customLabel = label;
          (group as any).isBasicShape = true;
          return group;
        }

        default: {
          // Rectangle
          shapeObj = new Rect({ left: 0, top: 0, width: 120, height: 80, rx: 4, ry: 4, ...baseProps });
          
          const labelText = new Textbox(label, {
            fontSize: 12,
            fill: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            width: 100,
            left: 60,
            top: 40,
          });

          const group = new FabricGroup([shapeObj, labelText], { left, top });
          centerGroupOrigin(group, left, top);
          (group as any).shapeId = shapeId;
          (group as any).shapeType = shapeType;
          (group as any).customLabel = label;
          (group as any).isBasicShape = true;
          return group;
        }
      }
    }
  }, [centerGroupOrigin]);

  // Add component with smart positioning
  const addComponent = useCallback(
    async (preset: ShapePreset, position?: { left: number; top: number }) => {
      if (!fabricCanvas) return;

      const width = 120;
      const height = 80;
      const pos = position || findEmptyPosition(width, height);

      const shape = await createShape(preset.id, preset.color, pos.left, pos.top, preset.label);

      fabricCanvas.add(shape);
      fabricCanvas.bringObjectToFront(shape);
      fabricCanvas.setActiveObject(shape);
      fabricCanvas.renderAll();

      setActiveTool("select");
      toast.success(`Added ${preset.label}`);
    },
    [fabricCanvas, findEmptyPosition, createShape]
  );

  // Drag from sidebar onto canvas
  const handleDragStart = (e: React.DragEvent, preset: ShapePreset) => {
    setDraggedShape(preset);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", preset.id);
    const dragIcon = document.createElement("div");
    dragIcon.style.cssText = `
      width: 60px; height: 40px; background: ${preset.color}; border-radius: 8px;
      opacity: 0.9; display: flex; align-items: center; justify-content: center;
      color: white; font-size: 10px; font-weight: bold;
    `;
    dragIcon.textContent = preset.label;
    document.body.appendChild(dragIcon);
    e.dataTransfer.setDragImage(dragIcon, 30, 20);
    setTimeout(() => document.body.removeChild(dragIcon), 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedShape || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 60;
    const y = e.clientY - rect.top - 40;
    addComponent(draggedShape, { left: Math.max(0, x), top: Math.max(0, y) });
    setDraggedShape(null);
  };

  // Connector mode handlers
  const startConnector = useCallback((obj: FabricObject) => {
    const center = obj.getCenterPoint();
    setConnectorStart({ obj, x: center.x, y: center.y });
    toast.info("Click on another shape to complete the connection");
  }, []);

  // Create a connector between two shapes (used by both click-click and drag-to-connect)
  const createConnectorBetween = useCallback(
    (startObj: FabricObject, endObj: FabricObject) => {
      if (!fabricCanvas) return;
      const connector = createFabricConnector(
        startObj,
        endObj,
        connectorStyle,
        arrowStyle,
        strokeColor,
        strokeWidth
      );
      fabricCanvas.add(connector);
      fabricCanvas.sendObjectToBack(connector);
      fabricCanvas.renderAll();
      setConnectorStart(null);
      setActiveTool("select");
      toast.success("Connector added");
    },
    [fabricCanvas, connectorStyle, arrowStyle, strokeColor, strokeWidth]
  );

  const completeConnector = useCallback(
    (endObj: FabricObject) => {
      if (!connectorStart) return;
      createConnectorBetween(connectorStart.obj, endObj);
    },
    [connectorStart, createConnectorBetween]
  );

  // Canvas click handler for connector mode
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (e: any) => {
      if (activeTool !== "connector") return;

      const target = e.target;
      if (!target || (target as any).isConnector || (target as any).isLabel) return;

      if (!connectorStart) {
        startConnector(target);
      } else if (target !== connectorStart.obj) {
        completeConnector(target);
      }
    };

    fabricCanvas.on("mouse:down", handleMouseDown);
    return () => {
      fabricCanvas.off("mouse:down", handleMouseDown);
    };
  }, [fabricCanvas, activeTool, connectorStart, startConnector, completeConnector]);

  // Start connector from selection toolbar (no click-A-then-B in select mode)
  const startConnectorFromSelection = useCallback(() => {
    if (!selectedObject || (selectedObject as any).isConnector) return;
    startConnector(selectedObject);
    setActiveTool("connector");
    toast.info("Click another shape to connect");
  }, [selectedObject, startConnector]);

  // Sync label when user finishes editing the text inline (editing:exited)
  useEffect(() => {
    if (!fabricCanvas) return;
    const handleEditingExited = (e: any) => {
      const textObj = e.target;
      if (!(textObj instanceof Textbox)) return;
      const newText = textObj.text ?? "";
      setObjectLabel(newText);
      // Update customLabel on parent group if this text is inside a shape group
      const objects = fabricCanvas.getObjects();
      for (const obj of objects) {
        if (obj instanceof FabricGroup && obj.getObjects().indexOf(textObj) >= 0) {
          (obj as any).customLabel = newText;
          setSelectedObject(obj);
          break;
        }
      }
      fabricCanvas.renderAll();
    };
    fabricCanvas.on("editing:exited", handleEditingExited);
    return () => fabricCanvas.off("editing:exited", handleEditingExited);
  }, [fabricCanvas]);

  const handleUndo = useCallback(async () => {
    if (!fabricCanvas || historyStep === 0) return;

    const newStep = historyStep - 1;
    const prevState = history[newStep];

    if (prevState) {
      await fabricCanvas.loadFromJSON(JSON.parse(prevState));
      fabricCanvas.renderAll();
      setHistoryStep(newStep);
      historyStepRef.current = newStep;
      toast.success("Undo");
    }
  }, [fabricCanvas, historyStep, history]);

  const handleRedo = useCallback(async () => {
    if (!fabricCanvas || historyStep >= history.length - 1) return;

    const newStep = historyStep + 1;
    const nextState = history[newStep];

    if (nextState) {
      await fabricCanvas.loadFromJSON(JSON.parse(nextState));
      fabricCanvas.renderAll();
      setHistoryStep(newStep);
      historyStepRef.current = newStep;
      toast.success("Redo");
    }
  }, [fabricCanvas, historyStep, history]);

  // Jump to specific history step
  const handleJumpToStep = useCallback(async (step: number) => {
    if (!fabricCanvas || step < 0 || step >= history.length) return;

    const state = history[step];
    if (state) {
      await fabricCanvas.loadFromJSON(JSON.parse(state));
      fabricCanvas.renderAll();
      setHistoryStep(step);
      historyStepRef.current = step;
    }
  }, [fabricCanvas, history]);

  // Update label
  const handleLabelChange = useCallback(
    (newLabel: string) => {
      setObjectLabel(newLabel);
      if (!fabricCanvas || !selectedObject) return;

      (selectedObject as any).customLabel = newLabel;

      // For grouped shapes, update the internal text
      if ((selectedObject as any).isIconShape || (selectedObject as any).isBasicShape) {
        if (selectedObject instanceof FabricGroup) {
          const objects = selectedObject.getObjects();
          const textObj = objects.find(o => o instanceof Textbox);
          if (textObj) {
            (textObj as Textbox).set('text', newLabel);
          }
        }
      } else if (selectedObject instanceof Textbox) {
        selectedObject.set('text', newLabel);
      } else {
        // Find and update associated text for non-grouped shapes
        const shapeId = (selectedObject as any).shapeId;
        const objects = fabricCanvas.getObjects();
        for (const obj of objects) {
          if ((obj as any).isLabel && (obj as any).parentShapeId === shapeId) {
            (obj as Textbox).set("text", newLabel);
            break;
          }
        }
      }
      fabricCanvas.renderAll();
    },
    [fabricCanvas, selectedObject]
  );

  // Apply text formatting
  const applyTextFormatting = useCallback(() => {
    if (!fabricCanvas || !selectedObject) return;

    const applyToTextbox = (textbox: Textbox) => {
      textbox.set('fontWeight', isBold ? 'bold' : 'normal');
      textbox.set('fontStyle', isItalic ? 'italic' : 'normal');
      textbox.set('fontFamily', fontFamily);
      textbox.set('fontSize', labelFontSize);
    };

    if (selectedObject instanceof Textbox) {
      applyToTextbox(selectedObject);
    } else if ((selectedObject as any).isIconShape || (selectedObject as any).isBasicShape) {
      if (selectedObject instanceof FabricGroup) {
        const textObj = selectedObject.getObjects().find(o => o instanceof Textbox);
        if (textObj) {
          applyToTextbox(textObj as Textbox);
        }
      }
    }

    fabricCanvas.renderAll();
  }, [fabricCanvas, selectedObject, isBold, isItalic, fontFamily, labelFontSize]);

  // Apply formatting when states change
  useEffect(() => {
    applyTextFormatting();
  }, [isBold, isItalic, fontFamily, labelFontSize, applyTextFormatting]);

  // Apply colors to selected object
  useEffect(() => {
    if (selectedObject && fabricCanvas) {
      if ((selectedObject as any).isIconShape || (selectedObject as any).isBasicShape) {
        if (selectedObject instanceof FabricGroup) {
          const objects = selectedObject.getObjects();
          const bgShape = objects.find(o => o instanceof Rect || o instanceof Polygon || o instanceof Circle);
          if (bgShape) {
            bgShape.set("fill", fillColor);
            bgShape.set("stroke", strokeColor);
            bgShape.set("strokeWidth", strokeWidth);
          }
        }
      } else if (!(selectedObject as any).isConnector) {
        selectedObject.set("fill", fillColor);
        selectedObject.set("stroke", strokeColor);
        selectedObject.set("strokeWidth", strokeWidth);
      } else {
        // For connectors, only update stroke
        selectedObject.set("stroke", strokeColor);
        selectedObject.set("strokeWidth", strokeWidth);
      }
      fabricCanvas.renderAll();
    }
  }, [fillColor, strokeColor, strokeWidth, selectedObject, fabricCanvas]);

  // Group selected objects
  const groupSelected = useCallback(() => {
    if (!fabricCanvas) return;
    const activeSelection = fabricCanvas.getActiveObject();
    
    if (activeSelection && activeSelection instanceof ActiveSelection) {
      const objects = activeSelection.getObjects();
      if (objects.length < 2) {
        toast.error("Select at least 2 objects to group");
        return;
      }

      fabricCanvas.discardActiveObject();
      const group = new FabricGroup(objects, {});
      
      objects.forEach(obj => fabricCanvas.remove(obj));
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
      fabricCanvas.renderAll();
      
      toast.success("Objects grouped");
    } else {
      toast.error("Select multiple objects to group");
    }
  }, [fabricCanvas]);

  // Ungroup selected group
  const ungroupSelected = useCallback(() => {
    if (!fabricCanvas || !selectedObject) return;
    
    if (selectedObject instanceof FabricGroup && !(selectedObject as any).isIconShape && !(selectedObject as any).isBasicShape) {
      const items = selectedObject.getObjects();
      
      fabricCanvas.remove(selectedObject);
      
      items.forEach(item => {
        fabricCanvas.add(item);
      });
      
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      
      toast.success("Objects ungrouped");
    } else {
      toast.error("Select a group to ungroup");
    }
  }, [fabricCanvas, selectedObject]);

  // Delete selected
  const deleteSelected = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => {
        const shapeId = (obj as any).shapeId;
        
        // Remove associated label
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
      });
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      setSelectedObject(null);
      toast.success("Deleted");
    }
  }, [fabricCanvas]);

  // Duplicate selected
  const duplicateSelected = useCallback(async () => {
    if (!fabricCanvas || !selectedObject) return;
    
    const pos = findEmptyPosition(
      selectedObject.width || 100,
      selectedObject.height || 80
    );

    const cloned = await selectedObject.clone();
    cloned.set({ left: pos.left, top: pos.top });
    (cloned as any).shapeId = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    fabricCanvas.add(cloned);
    fabricCanvas.setActiveObject(cloned);
    fabricCanvas.renderAll();
    toast.success("Duplicated");
  }, [fabricCanvas, selectedObject, findEmptyPosition]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        groupSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "g" && e.shiftKey) {
        e.preventDefault();
        ungroupSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (fabricCanvas) {
          const activeObjects = fabricCanvas.getActiveObjects();
          if (activeObjects.length > 0) {
            e.preventDefault();
            deleteSelected();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Escape") {
        setActiveTool("select");
        setConnectorStart(null);
        if (fabricCanvas) {
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
        }
      } else if (e.key === "v" || e.key === "V") {
        setActiveTool("select");
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowKeyboardShortcuts((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fabricCanvas, handleUndo, handleRedo, deleteSelected, groupSelected, ungroupSelected, duplicateSelected]);

  const handleToolClick = (tool: Tool) => {
    if (tool === "connector") {
      setActiveTool("connector");
      setConnectorStart(null);
      toast.info("Click on a shape to start a connector");
      return;
    }

    setActiveTool(tool);

    if (!fabricCanvas) return;

    const pos = findEmptyPosition(150, 80);

    if (tool === "rectangle") {
      const rect = new Rect({
        left: pos.left,
        top: pos.top,
        fill: "#6366f1",
        width: 120,
        height: 80,
        rx: 8,
        ry: 8,
        stroke: "#4338CA",
        strokeWidth: 2,
      });
      (rect as any).shapeId = `shape_${Date.now()}`;
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      setActiveTool("select");
    } else if (tool === "circle") {
      const circle = new Circle({
        left: pos.left,
        top: pos.top,
        fill: "#22c55e",
        radius: 50,
        stroke: "#16A34A",
        strokeWidth: 2,
      });
      (circle as any).shapeId = `shape_${Date.now()}`;
      fabricCanvas.add(circle);
      fabricCanvas.setActiveObject(circle);
      setActiveTool("select");
    } else if (tool === "text") {
      const text = new Textbox("Double click to edit", {
        left: pos.left,
        top: pos.top,
        fill: "#1e293b",
        fontSize: 16,
        width: 200,
        fontFamily: "Inter, sans-serif",
      });
      (text as any).shapeId = `text_${Date.now()}`;
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      setActiveTool("select");
    }
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const handleZoom = (direction: "in" | "out") => {
    if (!fabricCanvas) return;

    const newZoom = direction === "in" ? Math.min(zoom + 10, 200) : Math.max(zoom - 10, 50);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom / 100);
    fabricCanvas.renderAll();
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save diagrams");
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

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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

      const response = await fetch(dataURL);
      const blob = await response.blob();
      const file = new File([blob], "diagram.png", { type: "image/png" });
      const canvasJSON = JSON.stringify(fabricCanvas.toJSON());

      const token = getAccessToken();
      if (!token) {
        toast.error("Not authenticated");
        setSaving(false);
        return;
      }

      if (currentDiagramId) {
        await uploadDiagramImage(token, currentDiagramId, file);
        await updateDiagram(token, currentDiagramId, {
          title: diagramTitle,
          content: canvasJSON,
          diagram_type: "visual",
        });
        toast.success("Diagram updated successfully!");
      } else {
        const created = await createDiagram(token, {
          title: diagramTitle,
          content: canvasJSON,
          diagram_type: "visual",
          is_public: false,
          workspace_id: workspaceId || null,
        });
        setCurrentDiagramId(created.id);
        await uploadDiagramImage(token, created.id, file);
        toast.success("Diagram saved successfully!");
      }

      setHasUnsavedChanges(false);
      onSave?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save diagram"));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (format: "png" | "svg" = "png") => {
    if (!fabricCanvas) return;

    const objects = fabricCanvas.getObjects().filter(obj => !(obj as any).isGuideLine);
    if (objects.length === 0) {
      toast.error("Canvas is empty");
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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

    if (format === "svg") {
      const svgData = fabricCanvas.toSVG({
        viewBox: {
          x: minX - padding,
          y: minY - padding,
          width: width,
          height: height,
        },
        width: `${width}px`,
        height: `${height}px`,
      });
      
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${diagramTitle}-${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("SVG downloaded!");
    } else {
      const dataURL = fabricCanvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 2,
        left: minX - padding,
        top: minY - padding,
        width: width,
        height: height,
      });

      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `${diagramTitle}-${Date.now()}.png`;
      link.click();
      toast.success("PNG downloaded!");
    }
  };

  // Handle new diagram request with unsaved changes check
  // Removed unused _handleNewDiagramRequest

  const handleDiscardAndNew = () => {
    setShowUnsavedDialog(false);
    onRequestNew?.();
  };

  const handleSaveAndNew = async () => {
    await handleSave();
    setShowUnsavedDialog(false);
    onRequestNew?.();
  };

  const PRESET_COLORS = [
    "#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B",
    "#22C55E", "#14B8A6", "#3B82F6", "#64748B", "#1F2937"
  ];

  return (
    <div className="flex-1 flex h-full overflow-hidden relative" tabIndex={-1}>
      {/* Left Panel - Shapes Library (Responsive) */}
      <div className={`${showShapesPanel ? 'w-64 lg:w-72' : 'w-0'} border-r border-border bg-background flex flex-col transition-all duration-300 overflow-hidden`}>
        {/* Toolbar */}
        <div className="p-2 lg:p-3 border-b border-border flex items-center gap-1 flex-wrap">
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8" onClick={handleUndo} disabled={historyStep === 0}>
            <Undo className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8" onClick={handleRedo} disabled={historyStep >= history.length - 1}>
            <Redo className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
          <div className="w-px h-5 lg:h-6 bg-border mx-0.5 lg:mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8" onClick={() => handleZoom("out")}>
            <ZoomOut className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
          <span className="text-[10px] lg:text-xs text-muted-foreground w-8 lg:w-10 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8" onClick={() => handleZoom("in")}>
            <ZoomIn className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
          <div className="w-px h-5 lg:h-6 bg-border mx-0.5 lg:mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8" onClick={() => setShowKeyboardShortcuts(true)} title="Keyboard shortcuts (?)">
            <Keyboard className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {/* Basic Tools */}
          <div className="p-3 lg:p-4">
            <h3 className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 lg:mb-3">Tools</h3>
            <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
              <Button
                variant={activeTool === "select" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-1.5 lg:gap-2 h-8 lg:h-9 text-xs lg:text-sm"
                onClick={() => {
                  setActiveTool("select");
                  setConnectorStart(null);
                }}
              >
                <MousePointer className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                Select
              </Button>
              <Button
                variant={activeTool === "connector" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-1.5 lg:gap-2 h-8 lg:h-9 text-xs lg:text-sm"
                onClick={() => handleToolClick("connector")}
              >
                <Spline className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                Connect
              </Button>
              <Button
                variant={activeTool === "rectangle" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-1.5 lg:gap-2 h-8 lg:h-9 text-xs lg:text-sm"
                onClick={() => handleToolClick("rectangle")}
              >
                <Square className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                Rect
              </Button>
              <Button
                variant={activeTool === "circle" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-1.5 lg:gap-2 h-8 lg:h-9 text-xs lg:text-sm"
                onClick={() => handleToolClick("circle")}
              >
                <CircleIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                Circle
              </Button>
              <Button
                variant={activeTool === "text" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-1.5 lg:gap-2 h-8 lg:h-9 text-xs lg:text-sm"
                onClick={() => handleToolClick("text")}
              >
                <Type className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                Text
              </Button>
              <Button
                variant={showLayers ? "secondary" : "ghost"}
                size="sm"
                className="justify-start gap-1.5 lg:gap-2 h-8 lg:h-9 text-xs lg:text-sm"
                onClick={() => setShowLayers(!showLayers)}
              >
                <Layers className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                Layers
              </Button>
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <h3 className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">View</h3>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant={showProperties ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start gap-1.5 h-8 lg:h-9 text-xs"
                  onClick={() => setShowProperties(!showProperties)}
                  title="Properties"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Properties
                </Button>
                <Button
                  variant={showHistory ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start gap-1.5 h-8 lg:h-9 text-xs"
                  onClick={() => setShowHistory(!showHistory)}
                  title="History"
                >
                  <History className="w-3.5 h-3.5" />
                  History
                </Button>
              </div>
            </div>
            
            {/* Group/Ungroup buttons */}
            <div className="grid grid-cols-2 gap-1.5 lg:gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-1.5 lg:gap-2 h-8 lg:h-9 text-xs lg:text-sm"
                onClick={groupSelected}
              >
                <Group className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                Group
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-1.5 lg:gap-2 h-8 lg:h-9 text-xs lg:text-sm"
                onClick={ungroupSelected}
              >
                <Ungroup className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                Ungroup
              </Button>
            </div>
          </div>

          <Separator />

          {/* Connector Settings (when connector tool active) */}
          {activeTool === "connector" && (
            <>
              <div className="p-3 lg:p-4">
                <h3 className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 lg:mb-3">Connector Style</h3>
                <div className="space-y-2 lg:space-y-3">
                  <div>
                    <Label className="text-[10px] lg:text-xs text-muted-foreground">Line Style</Label>
                    <Select value={connectorStyle} onValueChange={(v) => setConnectorStyle(v as ConnectorStyle)}>
                      <SelectTrigger className="h-7 lg:h-8 mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="curved">Curved</SelectItem>
                        <SelectItem value="straight">Straight</SelectItem>
                        <SelectItem value="elbow">Elbow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] lg:text-xs text-muted-foreground">Arrows</Label>
                    <Select value={arrowStyle} onValueChange={(v) => setArrowStyle(v as ArrowStyle)}>
                      <SelectTrigger className="h-7 lg:h-8 mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Arrows</SelectItem>
                        <SelectItem value="end">End Arrow</SelectItem>
                        <SelectItem value="start">Start Arrow</SelectItem>
                        <SelectItem value="both">Both Arrows</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Shape Categories with Search */}
          <div className="p-1.5 lg:p-2">
            <div className="px-1.5 lg:px-2 py-1.5 lg:py-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search shapes..."
                  value={shapeSearchQuery}
                  onChange={(e) => setShapeSearchQuery(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
            </div>
            <p className="px-1.5 lg:px-2 py-1 text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Drag to add components
            </p>
            {SHAPE_CATEGORIES.map((category) => {
              const filteredShapes = shapeSearchQuery
                ? category.shapes.filter(s => s.label.toLowerCase().includes(shapeSearchQuery.toLowerCase()))
                : category.shapes;
              
              if (shapeSearchQuery && filteredShapes.length === 0) return null;
              
              return (
                <Collapsible
                  key={category.name}
                  open={shapeSearchQuery ? true : expandedCategories.includes(category.name)}
                  onOpenChange={() => toggleCategory(category.name)}
                >
                  <CollapsibleTrigger className="flex items-center gap-1.5 lg:gap-2 w-full px-1.5 lg:px-2 py-1.5 lg:py-2 text-xs lg:text-sm font-medium hover:bg-muted rounded-md">
                    {(shapeSearchQuery ? true : expandedCategories.includes(category.name)) ? (
                      <ChevronDown className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    )}
                    {category.icon}
                    {category.name}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-3 gap-1 p-1.5 lg:p-2">
                      {filteredShapes.map((shape) => (
                        <div
                          key={shape.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, shape)}
                          onClick={() => addComponent(shape)}
                          className="flex flex-col items-center justify-center p-1.5 lg:p-2 rounded-md border bg-background hover:bg-accent hover:border-primary/30 transition-colors cursor-grab active:cursor-grabbing text-left"
                          title={`Drag to canvas or click to add ${shape.label}`}
                        >
                          <div
                            className="w-7 h-7 lg:w-8 lg:h-8 rounded flex items-center justify-center text-white"
                            style={{ backgroundColor: shape.color }}
                          >
                            <shape.icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          </div>
                          <span className="text-[9px] lg:text-[10px] text-muted-foreground mt-0.5 lg:mt-1 text-center truncate w-full">
                            {shape.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          <Separator />

          {/* Shortcuts & Comments */}
          <div className="p-3 lg:p-4">
            <h3 className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 lg:mb-3">Shortcuts</h3>
            <div className="space-y-0.5 lg:space-y-1 text-[10px] lg:text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Save</span>
                <kbd className="px-1 lg:px-1.5 py-0.5 bg-muted rounded text-[9px] lg:text-[10px]">⌘S</kbd>
              </div>
              <div className="flex justify-between">
                <span>Undo</span>
                <kbd className="px-1 lg:px-1.5 py-0.5 bg-muted rounded text-[9px] lg:text-[10px]">⌘Z</kbd>
              </div>
              <div className="flex justify-between">
                <span>Duplicate</span>
                <kbd className="px-1 lg:px-1.5 py-0.5 bg-muted rounded text-[9px] lg:text-[10px]">⌘D</kbd>
              </div>
              <div className="flex justify-between">
                <span>Group</span>
                <kbd className="px-1 lg:px-1.5 py-0.5 bg-muted rounded text-[9px] lg:text-[10px]">⌘G</kbd>
              </div>
              <div className="flex justify-between">
                <span>Ungroup</span>
                <kbd className="px-1 lg:px-1.5 py-0.5 bg-muted rounded text-[9px] lg:text-[10px]">⌘⇧G</kbd>
              </div>
              <div className="flex justify-between">
                <span>Delete</span>
                <kbd className="px-1 lg:px-1.5 py-0.5 bg-muted rounded text-[9px] lg:text-[10px]">Del</kbd>
              </div>
            </div>
          </div>

          <div className="p-3 lg:p-4 pt-0 space-y-1">
            <Button
              variant={showHistory ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start gap-2 h-8 lg:h-9 text-xs lg:text-sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              History
            </Button>
            <Button
              variant={showComments ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start gap-2 h-8 lg:h-9 text-xs lg:text-sm"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              Comments
            </Button>
          </div>
        </ScrollArea>
      </div>

      {/* Toggle sidebar button (mobile) */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-2 top-2 z-30 h-8 w-8 lg:hidden bg-background"
        onClick={() => setShowShapesPanel(!showShapesPanel)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Layers Panel */}
      <LayersPanel
        fabricCanvas={fabricCanvas}
        isOpen={showLayers}
        onClose={() => setShowLayers(false)}
        selectedObject={selectedObject}
        onSelectObject={setSelectedObject}
      />

      {/* History Panel */}
      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        currentStep={historyStep}
        onJumpToStep={handleJumpToStep}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Title Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-background border border-border rounded-lg shadow-sm px-3 lg:px-4 py-1.5 lg:py-2">
            <Input
              value={diagramTitle}
              onChange={(e) => setDiagramTitle(e.target.value)}
              placeholder="Diagram title..."
              className="text-center font-medium border-none shadow-none px-2 focus-visible:ring-0 bg-transparent min-w-[150px] lg:min-w-[200px] text-sm lg:text-base"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 z-20 flex gap-1.5 lg:gap-2">
          {user && (
            <Button onClick={handleSave} disabled={saving} size="sm" className="shadow-sm h-8 lg:h-9 text-xs lg:text-sm">
              <Save className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
              <span className="hidden sm:inline">{saving ? "Saving..." : "Save"}</span>
            </Button>
          )}
          <div className="flex gap-1">
            <Button onClick={() => handleDownload("png")} variant="outline" size="sm" className="shadow-sm bg-background h-8 lg:h-9 text-xs lg:text-sm">
              <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4 sm:mr-1 lg:mr-2" />
              <span className="hidden sm:inline">PNG</span>
            </Button>
            <Button onClick={() => handleDownload("svg")} variant="outline" size="sm" className="shadow-sm bg-background h-8 lg:h-9 text-xs lg:text-sm">
              <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4 sm:mr-1 lg:mr-2" />
              <span className="hidden sm:inline">SVG</span>
            </Button>
          </div>
        </div>

        {/* Selection toolbar: appears when a shape on canvas is selected */}
        {selectedObject && !(selectedObject as any).isConnector && !mermaidContent && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/95">
            <span className="text-[10px] lg:text-xs text-muted-foreground mr-2">Selection</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 lg:h-8 text-xs"
              onClick={startConnectorFromSelection}
              title="Connect to another shape"
            >
              <Link2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
              Connector
            </Button>
          </div>
        )}

        {/* Canvas with fabric-style background; diagram can sit on top (e.g. white bg shape) */}
        <div
          ref={containerRef}
          className="flex-1 relative min-h-0"
          style={{
            backgroundColor: "#ebe8e4",
            backgroundImage: `
              linear-gradient(to right, #d4cfc9 0.5px, transparent 0.5px),
              linear-gradient(to bottom, #d4cfc9 0.5px, transparent 0.5px)
            `,
            backgroundSize: "20px 20px",
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          tabIndex={0}
        >
          {mermaidContent ? (
            <div
              ref={mermaidContainerRef}
              className="absolute inset-0 overflow-auto flex items-center justify-center p-8 bg-background/95"
            />
          ) : (
            <canvas ref={canvasRef} className="absolute inset-0" tabIndex={0} />
          )}
        </div>
      </div>

      {/* Sliding Properties Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-64 lg:w-72 bg-background border-l border-border shadow-2xl flex flex-col z-30 transition-transform duration-300 ease-out ${
          showProperties ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-3 lg:px-4 py-2 lg:py-3 border-b border-border">
          <h3 className="font-semibold text-xs lg:text-sm">Properties</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6 lg:h-7 lg:w-7" onClick={() => setShowProperties(false)}>
            <X className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 lg:p-4">
            {selectedObject ? (
              <div className="space-y-3 lg:space-y-4">
                {/* Label */}
                <div>
                  <Label className="text-[10px] lg:text-xs text-muted-foreground">Label</Label>
                  <Input
                    value={objectLabel}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="Enter label..."
                    className="mt-1 h-8 lg:h-9 text-sm"
                  />
                </div>

                {/* Text Formatting */}
                <div>
                  <Label className="text-[10px] lg:text-xs text-muted-foreground">Text Style</Label>
                  <div className="mt-1.5 lg:mt-2 flex items-center gap-1.5 lg:gap-2">
                    <Toggle
                      pressed={isBold}
                      onPressedChange={setIsBold}
                      size="sm"
                      className="h-8 w-8"
                      aria-label="Toggle bold"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </Toggle>
                    <Toggle
                      pressed={isItalic}
                      onPressedChange={setIsItalic}
                      size="sm"
                      className="h-8 w-8"
                      aria-label="Toggle italic"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </Toggle>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Font" />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                          <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Label Font Size */}
                <div>
                  <Label className="text-[10px] lg:text-xs text-muted-foreground">Label Size</Label>
                  <div className="mt-1.5 lg:mt-2 flex items-center gap-2 lg:gap-3">
                    <Slider
                      value={[labelFontSize]}
                      onValueChange={(v) => setLabelFontSize(v[0])}
                      min={8}
                      max={24}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs lg:text-sm w-8 text-right">{labelFontSize}px</span>
                  </div>
                </div>

                <Separator />

                {/* Fill Color */}
                {!(selectedObject as any).isConnector && (
                  <div>
                    <Label className="text-[10px] lg:text-xs text-muted-foreground">Fill Color</Label>
                    <div className="mt-1.5 lg:mt-2 grid grid-cols-5 gap-1 lg:gap-1.5">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setFillColor(color)}
                          className={`w-6 h-6 lg:w-8 lg:h-8 rounded-md border-2 transition-all hover:scale-105 ${
                            fillColor === color ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 lg:mt-2 flex items-center gap-1.5 lg:gap-2">
                      <input
                        type="color"
                        value={fillColor}
                        onChange={(e) => setFillColor(e.target.value)}
                        className="w-8 h-8 lg:w-9 lg:h-9 rounded cursor-pointer border border-border p-0.5"
                      />
                      <Input
                        value={fillColor}
                        onChange={(e) => setFillColor(e.target.value)}
                        className="h-8 lg:h-9 flex-1 font-mono text-[10px] lg:text-xs uppercase"
                      />
                    </div>
                  </div>
                )}

                {/* Stroke Color */}
                <div>
                  <Label className="text-[10px] lg:text-xs text-muted-foreground">Stroke Color</Label>
                  <div className="mt-1.5 lg:mt-2 grid grid-cols-5 gap-1 lg:gap-1.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setStrokeColor(color)}
                        className={`w-6 h-6 lg:w-8 lg:h-8 rounded-md border-2 transition-all hover:scale-105 ${
                          strokeColor === color ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 lg:mt-2 flex items-center gap-1.5 lg:gap-2">
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-8 h-8 lg:w-9 lg:h-9 rounded cursor-pointer border border-border p-0.5"
                    />
                    <Input
                      value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="h-8 lg:h-9 flex-1 font-mono text-[10px] lg:text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Stroke Width */}
                <div>
                  <Label className="text-[10px] lg:text-xs text-muted-foreground">Stroke Width</Label>
                  <div className="mt-1.5 lg:mt-2 flex items-center gap-2 lg:gap-3">
                    <Slider
                      value={[strokeWidth]}
                      onValueChange={(v) => setStrokeWidth(v[0])}
                      min={0}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs lg:text-sm w-8 text-right">{strokeWidth}px</span>
                  </div>
                </div>

                <Separator />

                {/* Alignment Tools */}
                <AlignmentTools fabricCanvas={fabricCanvas} />

                <Separator />

                {/* Actions */}
                <div className="flex gap-1.5 lg:gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={duplicateSelected}>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs text-destructive hover:text-destructive"
                    onClick={deleteSelected}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-xs lg:text-sm py-6 lg:py-8">
                <MousePointer className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 opacity-50" />
                <p>Select an object to edit its properties</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Comments Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-80 lg:w-96 bg-background border-l border-border shadow-2xl flex flex-col z-40 transition-transform duration-300 ease-out ${
          showComments ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
            <h3 className="font-semibold text-base lg:text-lg">Comments</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8 hover:bg-muted" onClick={() => setShowComments(false)}>
            <X className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 lg:p-5">
            {currentDiagramId ? (
              <CommentsPanel diagramId={currentDiagramId} user={user} accessToken={getAccessToken() ?? ""} commentsVersion={commentsVersion} />
            ) : (
              <div className="text-center text-muted-foreground py-10 lg:py-12">
                <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3 lg:mb-4">
                  <MessageSquare className="w-7 h-7 lg:w-8 lg:h-8 opacity-50" />
                </div>
                <p className="text-xs lg:text-sm font-medium">No comments yet</p>
                <p className="text-[10px] lg:text-xs mt-1 opacity-70">Save your diagram to enable comments</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {currentDiagramId && user && <CommentInput diagramId={currentDiagramId} user={user} accessToken={getAccessToken() ?? ""} onCommentAdded={() => setCommentsVersion((v) => v + 1)} />}
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save your diagram before creating a new one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedDialog(false)}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDiscardAndNew}>
              Discard
            </Button>
            <AlertDialogAction onClick={handleSaveAndNew}>
              Save & Create New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcutsPanel
        open={showKeyboardShortcuts}
        onOpenChange={setShowKeyboardShortcuts}
      />
    </div>
  );
}

// Comments Panel component
function CommentsPanel({
  diagramId,
  user: _user,
  accessToken,
  commentsVersion,
}: {
  diagramId: string;
  user: ApiUser | null;
  accessToken: string;
  commentsVersion: number;
}) {
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      const data = await listComments(accessToken, diagramId);
      setComments(data);
    } catch (error) {
      console.error("Failed to load comments", error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, diagramId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments, commentsVersion]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);

    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins} minutes ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return date.toLocaleDateString();
  };

  const getUserInitials = (userId: string) => {
    return userId.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return <div className="text-center text-muted-foreground py-4">Loading...</div>;
  }

  if (comments.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-sm">No comments yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <div key={comment.id} className="group">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 shrink-0 ring-2 ring-background shadow-sm">
              <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                {getUserInitials(comment.user_id)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">User</span>
                <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
              </div>
              <div className="bg-muted/50 rounded-xl rounded-tl-sm p-3">
                <p className="text-sm text-foreground leading-relaxed">{comment.comment_text}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Comment Input component
function CommentInput({
  diagramId,
  user,
  accessToken,
  onCommentAdded,
}: {
  diagramId: string;
  user: ApiUser;
  accessToken: string;
  onCommentAdded: () => void;
}) {
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting || !accessToken) return;

    setSubmitting(true);
    try {
      await addComment(accessToken, diagramId, newComment.trim());
      setNewComment("");
      onCommentAdded();
      toast.success("Comment added");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to add comment"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 border-t border-border bg-muted/30">
      <div className="flex items-center gap-3">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {user.email?.substring(0, 2).toUpperCase() || "ME"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex items-center gap-2 bg-background rounded-full border border-border px-4 py-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
          <Input
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
            className="flex-1 border-none shadow-none px-0 focus-visible:ring-0 bg-transparent h-auto py-0"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="h-8 w-8 rounded-full shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
