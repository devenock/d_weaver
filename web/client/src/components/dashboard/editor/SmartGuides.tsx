import { useEffect, useRef, useCallback } from "react";
import { Canvas as FabricCanvas, FabricObject, Line } from "fabric";

interface SmartGuidesProps {
  fabricCanvas: FabricCanvas | null;
  enabled?: boolean;
  snapThreshold?: number;
}

interface GuideLines {
  vertical: Line[];
  horizontal: Line[];
}

export function useSmartGuides({ 
  fabricCanvas, 
  enabled = true, 
  snapThreshold = 10 
}: SmartGuidesProps) {
  const guideLinesRef = useRef<GuideLines>({ vertical: [], horizontal: [] });

  const clearGuides = useCallback(() => {
    if (!fabricCanvas) return;
    
    guideLinesRef.current.vertical.forEach(line => {
      fabricCanvas.remove(line);
    });
    guideLinesRef.current.horizontal.forEach(line => {
      fabricCanvas.remove(line);
    });
    guideLinesRef.current = { vertical: [], horizontal: [] };
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const createGuideLine = useCallback((points: [number, number, number, number], _isVertical: boolean): Line => {
    const line = new Line(points, {
      stroke: '#6366f1',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    (line as any).isGuideLine = true;
    return line;
  }, []);

  const showSmartGuides = useCallback((movingObject: FabricObject) => {
    if (!fabricCanvas || !enabled) return;

    clearGuides();

    const objects = fabricCanvas.getObjects().filter(obj => 
      obj !== movingObject && 
      !(obj as any).isGuideLine &&
      !(obj as any).isConnector
    );

    if (objects.length === 0) return;

    const movingBounds = movingObject.getBoundingRect();
    const movingCenterX = movingBounds.left + movingBounds.width / 2;
    const movingCenterY = movingBounds.top + movingBounds.height / 2;
    const movingLeft = movingBounds.left;
    const movingRight = movingBounds.left + movingBounds.width;
    const movingTop = movingBounds.top;
    const movingBottom = movingBounds.top + movingBounds.height;

    const canvasHeight = fabricCanvas.getHeight();
    const canvasWidth = fabricCanvas.getWidth();

    let snappedX: number | null = null;
    let snappedY: number | null = null;

    objects.forEach(obj => {
      const objBounds = obj.getBoundingRect();
      const objCenterX = objBounds.left + objBounds.width / 2;
      const objCenterY = objBounds.top + objBounds.height / 2;
      const objLeft = objBounds.left;
      const objRight = objBounds.left + objBounds.width;
      const objTop = objBounds.top;
      const objBottom = objBounds.top + objBounds.height;

      // Vertical alignment (X axis)
      // Center to center
      if (Math.abs(movingCenterX - objCenterX) < snapThreshold) {
        const line = createGuideLine([objCenterX, 0, objCenterX, canvasHeight], true);
        fabricCanvas.add(line);
        guideLinesRef.current.vertical.push(line);
        snappedX = objCenterX - movingBounds.width / 2;
      }
      // Left to left
      if (Math.abs(movingLeft - objLeft) < snapThreshold) {
        const line = createGuideLine([objLeft, 0, objLeft, canvasHeight], true);
        fabricCanvas.add(line);
        guideLinesRef.current.vertical.push(line);
        snappedX = objLeft;
      }
      // Right to right
      if (Math.abs(movingRight - objRight) < snapThreshold) {
        const line = createGuideLine([objRight, 0, objRight, canvasHeight], true);
        fabricCanvas.add(line);
        guideLinesRef.current.vertical.push(line);
        snappedX = objRight - movingBounds.width;
      }
      // Left to right
      if (Math.abs(movingLeft - objRight) < snapThreshold) {
        const line = createGuideLine([objRight, 0, objRight, canvasHeight], true);
        fabricCanvas.add(line);
        guideLinesRef.current.vertical.push(line);
        snappedX = objRight;
      }
      // Right to left
      if (Math.abs(movingRight - objLeft) < snapThreshold) {
        const line = createGuideLine([objLeft, 0, objLeft, canvasHeight], true);
        fabricCanvas.add(line);
        guideLinesRef.current.vertical.push(line);
        snappedX = objLeft - movingBounds.width;
      }

      // Horizontal alignment (Y axis)
      // Center to center
      if (Math.abs(movingCenterY - objCenterY) < snapThreshold) {
        const line = createGuideLine([0, objCenterY, canvasWidth, objCenterY], false);
        fabricCanvas.add(line);
        guideLinesRef.current.horizontal.push(line);
        snappedY = objCenterY - movingBounds.height / 2;
      }
      // Top to top
      if (Math.abs(movingTop - objTop) < snapThreshold) {
        const line = createGuideLine([0, objTop, canvasWidth, objTop], false);
        fabricCanvas.add(line);
        guideLinesRef.current.horizontal.push(line);
        snappedY = objTop;
      }
      // Bottom to bottom
      if (Math.abs(movingBottom - objBottom) < snapThreshold) {
        const line = createGuideLine([0, objBottom, canvasWidth, objBottom], false);
        fabricCanvas.add(line);
        guideLinesRef.current.horizontal.push(line);
        snappedY = objBottom - movingBounds.height;
      }
      // Top to bottom
      if (Math.abs(movingTop - objBottom) < snapThreshold) {
        const line = createGuideLine([0, objBottom, canvasWidth, objBottom], false);
        fabricCanvas.add(line);
        guideLinesRef.current.horizontal.push(line);
        snappedY = objBottom;
      }
      // Bottom to top
      if (Math.abs(movingBottom - objTop) < snapThreshold) {
        const line = createGuideLine([0, objTop, canvasWidth, objTop], false);
        fabricCanvas.add(line);
        guideLinesRef.current.horizontal.push(line);
        snappedY = objTop - movingBounds.height;
      }
    });

    // Snap to the guide
    if (snappedX !== null || snappedY !== null) {
      const currentLeft = movingObject.left || 0;
      const currentTop = movingObject.top || 0;
      
      // Adjust for object origin
      const offsetX = movingBounds.left - currentLeft;
      const offsetY = movingBounds.top - currentTop;

      if (snappedX !== null) {
        movingObject.set('left', snappedX - offsetX);
      }
      if (snappedY !== null) {
        movingObject.set('top', snappedY - offsetY);
      }
    }

    fabricCanvas.renderAll();
  }, [fabricCanvas, enabled, snapThreshold, clearGuides, createGuideLine]);

  useEffect(() => {
    if (!fabricCanvas || !enabled) return;

    const handleObjectMoving = (e: any) => {
      if (e.target) {
        showSmartGuides(e.target);
      }
    };

    const handleObjectModified = () => {
      clearGuides();
    };

    const handleSelectionCleared = () => {
      clearGuides();
    };

    fabricCanvas.on('object:moving', handleObjectMoving);
    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('selection:cleared', handleSelectionCleared);

    return () => {
      fabricCanvas.off('object:moving', handleObjectMoving);
      fabricCanvas.off('object:modified', handleObjectModified);
      fabricCanvas.off('selection:cleared', handleSelectionCleared);
    };
  }, [fabricCanvas, enabled, showSmartGuides, clearGuides]);

  return { clearGuides };
}
