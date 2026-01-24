import { Canvas as FabricCanvas, Group, FabricObject, Rect, Textbox, ActiveSelection } from "fabric";
import { toast } from "sonner";

export function groupSelectedObjects(canvas: FabricCanvas): Group | null {
  const activeObject = canvas.getActiveObject();
  
  if (!activeObject) {
    toast.error("Please select objects to group");
    return null;
  }

  // Check if it's a selection of multiple objects
  if (activeObject.type !== 'activeSelection') {
    toast.error("Please select multiple objects to group");
    return null;
  }

  const selection = activeObject as ActiveSelection;
  const objects = selection.getObjects();

  if (objects.length < 2) {
    toast.error("Please select at least 2 objects to group");
    return null;
  }

  // Remove objects from canvas and create a group
  const clonedObjects: FabricObject[] = [];
  objects.forEach(obj => {
    canvas.remove(obj);
    clonedObjects.push(obj);
  });

  const group = new Group(clonedObjects, {
    left: selection.left,
    top: selection.top,
  });
  
  // Add group identifier
  (group as any).isCustomGroup = true;
  (group as any).groupId = `group-${Date.now()}`;
  
  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.discardActiveObject();
  canvas.setActiveObject(group);
  canvas.renderAll();
  
  toast.success("Objects grouped successfully!");
  return group;
}

export function ungroupSelectedObject(canvas: FabricCanvas): FabricObject[] | null {
  const activeObject = canvas.getActiveObject();
  
  if (!activeObject) {
    toast.error("Please select a group to ungroup");
    return null;
  }

  if (activeObject.type !== 'group') {
    toast.error("Selected object is not a group");
    return null;
  }

  const group = activeObject as Group;
  const objects = group.getObjects();
  const groupLeft = group.left || 0;
  const groupTop = group.top || 0;
  
  // Remove the group from canvas
  canvas.remove(group);
  
  // Add individual objects back to canvas
  const ungroupedObjects: FabricObject[] = [];
  objects.forEach(obj => {
    // Calculate absolute position
    const objLeft = (obj.left || 0) + groupLeft + (group.width || 0) / 2;
    const objTop = (obj.top || 0) + groupTop + (group.height || 0) / 2;
    
    obj.set({
      left: objLeft,
      top: objTop,
    });
    
    canvas.add(obj);
    ungroupedObjects.push(obj);
  });
  
  canvas.renderAll();
  
  toast.success("Group ungrouped successfully!");
  return ungroupedObjects;
}

export function createStickyNoteGroup(
  canvas: FabricCanvas,
  title: string,
  items: string[],
  x: number,
  y: number
): Group {
  const groupWidth = 220;
  const itemHeight = 30;
  const padding = 10;
  const headerHeight = 40;
  const totalHeight = headerHeight + (items.length * itemHeight) + padding * 2;

  // Create group background
  const background = new Rect({
    width: groupWidth,
    height: totalHeight,
    fill: "#F8FAFC",
    stroke: "#CBD5E1",
    strokeWidth: 2,
    rx: 8,
    ry: 8,
    shadow: {
      color: "rgba(0,0,0,0.1)",
      blur: 12,
      offsetX: 0,
      offsetY: 4,
    } as any,
  });

  // Create header background
  const header = new Rect({
    top: 0,
    width: groupWidth,
    height: headerHeight,
    fill: "#3B82F6",
    rx: 8,
    ry: 8,
  });

  // Clip header bottom corners
  const headerMask = new Rect({
    top: headerHeight - 8,
    width: groupWidth,
    height: 16,
    fill: "#3B82F6",
  });

  // Create title text
  const titleText = new Textbox(title, {
    left: padding - groupWidth / 2,
    top: 10 - totalHeight / 2,
    width: groupWidth - padding * 2,
    fontSize: 16,
    fontWeight: "bold",
    fill: "#FFFFFF",
    fontFamily: "system-ui, sans-serif",
  });

  // Create items
  const itemObjects: FabricObject[] = [];
  items.forEach((item, index) => {
    const itemText = new Textbox(`• ${item}`, {
      left: padding - groupWidth / 2,
      top: headerHeight + padding + (index * itemHeight) - totalHeight / 2,
      width: groupWidth - padding * 2,
      fontSize: 14,
      fill: "#374151",
      fontFamily: "system-ui, sans-serif",
    });
    itemObjects.push(itemText);
  });

  // Group all elements
  const group = new Group([background, header, headerMask, titleText, ...itemObjects], {
    left: x,
    top: y,
    selectable: true,
    hasControls: true,
  });

  // Mark as sticky note group
  (group as any).isStickyNoteGroup = true;
  (group as any).groupId = `sticky-group-${Date.now()}`;
  (group as any).groupTitle = title;

  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.renderAll();

  return group;
}

export function duplicateGroup(canvas: FabricCanvas): void {
  const activeObject = canvas.getActiveObject();
  
  if (!activeObject || activeObject.type !== 'group') {
    toast.error("Please select a group to duplicate");
    return;
  }

  const group = activeObject as Group;
  
  // Clone the group
  group.clone().then((clonedGroup: Group) => {
    clonedGroup.set({
      left: (group.left || 0) + 30,
      top: (group.top || 0) + 30,
    });
    
    canvas.add(clonedGroup);
    canvas.setActiveObject(clonedGroup);
    canvas.renderAll();
    
    toast.success("Group duplicated!");
  });
}

export function alignGroupedStickies(
  canvas: FabricCanvas,
  direction: 'horizontal' | 'vertical'
): void {
  const activeObject = canvas.getActiveObject();
  
  if (!activeObject || activeObject.type !== 'activeSelection') {
    toast.error("Please select multiple sticky notes to align");
    return;
  }

  const selection = activeObject as ActiveSelection;
  const objects = selection.getObjects();
  
  if (objects.length < 2) {
    toast.error("Please select at least 2 objects to align");
    return;
  }

  const spacing = 20;
  let currentPos = 0;

  objects.forEach((obj) => {
    if (direction === 'horizontal') {
      obj.set({ left: currentPos - (selection.width || 0) / 2 + (obj.width || 0) / 2 });
      currentPos += (obj.width || 0) + spacing;
    } else {
      obj.set({ top: currentPos - (selection.height || 0) / 2 + (obj.height || 0) / 2 });
      currentPos += (obj.height || 0) + spacing;
    }
  });

  canvas.renderAll();
  toast.success(`Aligned ${direction}ly!`);
}
