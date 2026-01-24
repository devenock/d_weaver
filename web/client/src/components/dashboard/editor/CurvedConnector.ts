import { Path, FabricObject } from 'fabric';

export type ConnectorStyle = 'straight' | 'curved' | 'elbow';
export type ArrowStyle = 'none' | 'start' | 'end' | 'both';

interface ConnectorOptions {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  style?: ConnectorStyle;
  arrowStyle?: ArrowStyle;
  stroke?: string;
  strokeWidth?: number;
}

export function createConnectorPath(options: ConnectorOptions): string {
  const {
    startX,
    startY,
    endX,
    endY,
    style = 'curved',
  } = options;

  if (style === 'straight') {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  if (style === 'elbow') {
    const midX = (startX + endX) / 2;
    return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
  }

  // Curved (bezier)
  const dx = endX - startX;
  const dy = endY - startY;
  const controlOffset = Math.min(Math.abs(dx), Math.abs(dy), 100) * 0.5;
  
  // Determine control point direction based on relative positions
  let cp1x, cp1y, cp2x, cp2y;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal dominant
    cp1x = startX + controlOffset;
    cp1y = startY;
    cp2x = endX - controlOffset;
    cp2y = endY;
  } else {
    // Vertical dominant
    cp1x = startX;
    cp1y = startY + Math.sign(dy) * controlOffset;
    cp2x = endX;
    cp2y = endY - Math.sign(dy) * controlOffset;
  }

  return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
}

export function createArrowHead(
  x: number,
  y: number,
  angle: number,
  size: number = 12
): string {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const p1 = {
    x: x - size * cos + (size / 2) * sin,
    y: y - size * sin - (size / 2) * cos,
  };
  const p2 = {
    x: x - size * cos - (size / 2) * sin,
    y: y - size * sin + (size / 2) * cos,
  };

  return `M ${x} ${y} L ${p1.x} ${p1.y} M ${x} ${y} L ${p2.x} ${p2.y}`;
}

export function calculateAngle(x1: number, y1: number, x2: number, y2: number): number {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

export function createConnectorWithArrows(
  options: ConnectorOptions
): { pathData: string; arrowPaths: string[] } {
  const {
    startX,
    startY,
    endX,
    endY,
    arrowStyle = 'end',
  } = options;

  const pathData = createConnectorPath(options);
  const arrowPaths: string[] = [];

  if (arrowStyle === 'start' || arrowStyle === 'both') {
    const angle = calculateAngle(endX, endY, startX, startY);
    arrowPaths.push(createArrowHead(startX, startY, angle + 180));
  }

  if (arrowStyle === 'end' || arrowStyle === 'both') {
    const angle = calculateAngle(startX, startY, endX, endY);
    arrowPaths.push(createArrowHead(endX, endY, angle));
  }

  return { pathData, arrowPaths };
}

export function createFabricConnector(
  startObj: FabricObject,
  endObj: FabricObject,
  style: ConnectorStyle = 'curved',
  arrowStyle: ArrowStyle = 'end',
  stroke: string = '#64748b',
  strokeWidth: number = 2
): Path {
  const startCenter = startObj.getCenterPoint();
  const endCenter = endObj.getCenterPoint();

  const { pathData, arrowPaths } = createConnectorWithArrows({
    startX: startCenter.x,
    startY: startCenter.y,
    endX: endCenter.x,
    endY: endCenter.y,
    style,
    arrowStyle,
  });

  const fullPath = [pathData, ...arrowPaths].join(' ');

  const connector = new Path(fullPath, {
    fill: 'transparent',
    stroke,
    strokeWidth,
    selectable: true,
    evented: true,
    objectCaching: false,
  });

  // Store connector metadata
  (connector as any).isConnector = true;
  (connector as any).connectorStyle = style;
  (connector as any).arrowStyle = arrowStyle;
  (connector as any).startObjectId = (startObj as any).shapeId;
  (connector as any).endObjectId = (endObj as any).shapeId;
  (connector as any).shapeId = `connector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return connector;
}

export function updateConnectorPath(
  connector: Path,
  startObj: FabricObject,
  endObj: FabricObject
): void {
  const startCenter = startObj.getCenterPoint();
  const endCenter = endObj.getCenterPoint();

  const style = (connector as any).connectorStyle || 'curved';
  const arrowStyle = (connector as any).arrowStyle || 'end';

  const { pathData, arrowPaths } = createConnectorWithArrows({
    startX: startCenter.x,
    startY: startCenter.y,
    endX: endCenter.x,
    endY: endCenter.y,
    style,
    arrowStyle,
  });

  const fullPath = [pathData, ...arrowPaths].join(' ');

  connector.set({
    path: (new Path(fullPath) as any).path,
  });
  connector.setCoords();
}
