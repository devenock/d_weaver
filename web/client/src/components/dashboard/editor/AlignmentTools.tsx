import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from 'lucide-react';
import { Canvas as FabricCanvas, FabricObject } from 'fabric';
import { toast } from 'sonner';

interface AlignmentToolsProps {
  fabricCanvas: FabricCanvas | null;
}

export function AlignmentTools({ fabricCanvas }: AlignmentToolsProps) {
  const getSelectedObjects = (): FabricObject[] => {
    if (!fabricCanvas) return [];
    const activeSelection = fabricCanvas.getActiveObjects();
    return activeSelection.filter((obj) => !(obj as any).isLabel);
  };

  const alignLeft = () => {
    const objects = getSelectedObjects();
    if (objects.length < 2) {
      toast.error('Select at least 2 objects');
      return;
    }

    const minLeft = Math.min(...objects.map((o) => o.left || 0));
    objects.forEach((obj) => {
      obj.set('left', minLeft);
      obj.setCoords();
    });
    fabricCanvas?.renderAll();
    toast.success('Aligned left');
  };

  const alignCenter = () => {
    const objects = getSelectedObjects();
    if (objects.length < 2) {
      toast.error('Select at least 2 objects');
      return;
    }

    const centers = objects.map((o) => (o.left || 0) + (o.width || 0) / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
    objects.forEach((obj) => {
      obj.set('left', avgCenter - (obj.width || 0) / 2);
      obj.setCoords();
    });
    fabricCanvas?.renderAll();
    toast.success('Aligned center');
  };

  const alignRight = () => {
    const objects = getSelectedObjects();
    if (objects.length < 2) {
      toast.error('Select at least 2 objects');
      return;
    }

    const maxRight = Math.max(...objects.map((o) => (o.left || 0) + (o.width || 0)));
    objects.forEach((obj) => {
      obj.set('left', maxRight - (obj.width || 0));
      obj.setCoords();
    });
    fabricCanvas?.renderAll();
    toast.success('Aligned right');
  };

  const alignTop = () => {
    const objects = getSelectedObjects();
    if (objects.length < 2) {
      toast.error('Select at least 2 objects');
      return;
    }

    const minTop = Math.min(...objects.map((o) => o.top || 0));
    objects.forEach((obj) => {
      obj.set('top', minTop);
      obj.setCoords();
    });
    fabricCanvas?.renderAll();
    toast.success('Aligned top');
  };

  const alignMiddle = () => {
    const objects = getSelectedObjects();
    if (objects.length < 2) {
      toast.error('Select at least 2 objects');
      return;
    }

    const middles = objects.map((o) => (o.top || 0) + (o.height || 0) / 2);
    const avgMiddle = middles.reduce((a, b) => a + b, 0) / middles.length;
    objects.forEach((obj) => {
      obj.set('top', avgMiddle - (obj.height || 0) / 2);
      obj.setCoords();
    });
    fabricCanvas?.renderAll();
    toast.success('Aligned middle');
  };

  const alignBottom = () => {
    const objects = getSelectedObjects();
    if (objects.length < 2) {
      toast.error('Select at least 2 objects');
      return;
    }

    const maxBottom = Math.max(...objects.map((o) => (o.top || 0) + (o.height || 0)));
    objects.forEach((obj) => {
      obj.set('top', maxBottom - (obj.height || 0));
      obj.setCoords();
    });
    fabricCanvas?.renderAll();
    toast.success('Aligned bottom');
  };

  const distributeHorizontally = () => {
    const objects = getSelectedObjects();
    if (objects.length < 3) {
      toast.error('Select at least 3 objects');
      return;
    }

    const sorted = [...objects].sort((a, b) => (a.left || 0) - (b.left || 0));
    const firstLeft = sorted[0].left || 0;
    const lastRight = (sorted[sorted.length - 1].left || 0) + (sorted[sorted.length - 1].width || 0);
    const totalWidth = sorted.reduce((sum, o) => sum + (o.width || 0), 0);
    const spacing = (lastRight - firstLeft - totalWidth) / (sorted.length - 1);

    let currentLeft = firstLeft;
    sorted.forEach((obj) => {
      obj.set('left', currentLeft);
      obj.setCoords();
      currentLeft += (obj.width || 0) + spacing;
    });
    fabricCanvas?.renderAll();
    toast.success('Distributed horizontally');
  };

  const distributeVertically = () => {
    const objects = getSelectedObjects();
    if (objects.length < 3) {
      toast.error('Select at least 3 objects');
      return;
    }

    const sorted = [...objects].sort((a, b) => (a.top || 0) - (b.top || 0));
    const firstTop = sorted[0].top || 0;
    const lastBottom = (sorted[sorted.length - 1].top || 0) + (sorted[sorted.length - 1].height || 0);
    const totalHeight = sorted.reduce((sum, o) => sum + (o.height || 0), 0);
    const spacing = (lastBottom - firstTop - totalHeight) / (sorted.length - 1);

    let currentTop = firstTop;
    sorted.forEach((obj) => {
      obj.set('top', currentTop);
      obj.setCoords();
      currentTop += (obj.height || 0) + spacing;
    });
    fabricCanvas?.renderAll();
    toast.success('Distributed vertically');
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">Align</p>
      <div className="flex gap-1 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={alignLeft}
          title="Align Left"
        >
          <AlignHorizontalJustifyStart className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={alignCenter}
          title="Align Center"
        >
          <AlignHorizontalJustifyCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={alignRight}
          title="Align Right"
        >
          <AlignHorizontalJustifyEnd className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={alignTop}
          title="Align Top"
        >
          <AlignVerticalJustifyStart className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={alignMiddle}
          title="Align Middle"
        >
          <AlignVerticalJustifyCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={alignBottom}
          title="Align Bottom"
        >
          <AlignVerticalJustifyEnd className="h-4 w-4" />
        </Button>
      </div>
      
      <Separator className="my-2" />
      
      <p className="text-xs text-muted-foreground font-medium">Distribute</p>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={distributeHorizontally}
          title="Distribute Horizontally"
        >
          <AlignHorizontalSpaceAround className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={distributeVertically}
          title="Distribute Vertically"
        >
          <AlignVerticalSpaceAround className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
