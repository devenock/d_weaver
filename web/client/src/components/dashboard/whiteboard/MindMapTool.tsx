import { Canvas as FabricCanvas, Circle, Line, Textbox, Group } from "fabric";

// Removed unused _MindMapNode interface

const NODE_COLORS = [
  { bg: "#3B82F6", text: "#FFFFFF" }, // Blue - root
  { bg: "#22C55E", text: "#FFFFFF" }, // Green
  { bg: "#F59E0B", text: "#FFFFFF" }, // Orange
  { bg: "#A855F7", text: "#FFFFFF" }, // Purple
  { bg: "#EC4899", text: "#FFFFFF" }, // Pink
  { bg: "#14B8A6", text: "#FFFFFF" }, // Teal
];

export function createMindMapNode(
  canvas: FabricCanvas,
  text: string,
  x: number,
  y: number,
  isRoot: boolean = false,
  colorIndex: number = 0
): Group {
  const color = NODE_COLORS[colorIndex % NODE_COLORS.length];
  const radius = isRoot ? 50 : 40;
  const fontSize = isRoot ? 16 : 14;

  // Create circle background
  const circle = new Circle({
    radius,
    fill: color.bg,
    stroke: isRoot ? "#1E40AF" : color.bg,
    strokeWidth: isRoot ? 3 : 0,
    originX: "center",
    originY: "center",
    shadow: {
      color: "rgba(0,0,0,0.2)",
      blur: 10,
      offsetX: 2,
      offsetY: 4,
    } as any,
  });

  // Create text
  const textbox = new Textbox(text, {
    fontSize,
    fill: color.text,
    textAlign: "center",
    fontFamily: "system-ui, sans-serif",
    fontWeight: isRoot ? "bold" : "normal",
    originX: "center",
    originY: "center",
    width: radius * 1.6,
  });

  // Group them together
  const group = new Group([circle, textbox], {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    selectable: true,
    hasControls: true,
  });

  // Store metadata
  (group as any).mindMapData = {
    id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    isRoot,
    colorIndex,
  };

  canvas.add(group);
  return group;
}

export function createMindMapConnection(
  canvas: FabricCanvas,
  fromNode: Group,
  toNode: Group
): Line {
  const fromCenter = fromNode.getCenterPoint();
  const toCenter = toNode.getCenterPoint();

  const line = new Line([fromCenter.x, fromCenter.y, toCenter.x, toCenter.y], {
    stroke: "#94A3B8",
    strokeWidth: 2,
    selectable: false,
    evented: false,
    strokeDashArray: undefined,
  });

  // Store connection metadata
  (line as any).mindMapConnection = {
    fromId: (fromNode as any).mindMapData?.id,
    toId: (toNode as any).mindMapData?.id,
  };

  // Add line behind nodes
  canvas.add(line);
  canvas.sendObjectToBack(line);

  return line;
}

export function updateMindMapConnections(canvas: FabricCanvas): void {
  const objects = canvas.getObjects();
  const nodes = objects.filter(obj => (obj as any).mindMapData);
  const connections = objects.filter(obj => (obj as any).mindMapConnection);

  connections.forEach(connection => {
    const conn = connection as Line;
    const connData = (conn as any).mindMapConnection;
    
    const fromNode = nodes.find(n => (n as any).mindMapData?.id === connData.fromId);
    const toNode = nodes.find(n => (n as any).mindMapData?.id === connData.toId);

    if (fromNode && toNode) {
      const fromCenter = (fromNode as Group).getCenterPoint();
      const toCenter = (toNode as Group).getCenterPoint();
      conn.set({
        x1: fromCenter.x,
        y1: fromCenter.y,
        x2: toCenter.x,
        y2: toCenter.y,
      });
    }
  });

  canvas.renderAll();
}

export function addChildNode(
  canvas: FabricCanvas,
  parentNode: Group,
  text: string = "New Node"
): Group {
  const parentData = (parentNode as any).mindMapData;
  const parentCenter = parentNode.getCenterPoint();
  
  // Position new node relative to parent
  const angle = Math.random() * Math.PI * 2;
  const distance = 150;
  const x = parentCenter.x + Math.cos(angle) * distance;
  const y = parentCenter.y + Math.sin(angle) * distance;

  const colorIndex = (parentData?.colorIndex || 0) + 1;
  const childNode = createMindMapNode(canvas, text, x, y, false, colorIndex);
  
  // Create connection
  createMindMapConnection(canvas, parentNode, childNode);

  canvas.setActiveObject(childNode);
  canvas.renderAll();

  return childNode;
}

export function createMindMapTemplate(canvas: FabricCanvas): void {
  // Create root node
  const centerX = canvas.getWidth() / 2;
  const centerY = canvas.getHeight() / 2;
  
  const root = createMindMapNode(canvas, "Main Idea", centerX, centerY, true, 0);
  
  // Create child nodes
  const childTexts = ["Topic 1", "Topic 2", "Topic 3"];
  const childAngles = [(-Math.PI / 3), (Math.PI / 3), Math.PI];
  
  childTexts.forEach((text, index) => {
    const angle = childAngles[index];
    const distance = 180;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    
    const childNode = createMindMapNode(canvas, text, x, y, false, index + 1);
    createMindMapConnection(canvas, root, childNode);
  });

  canvas.renderAll();
}
