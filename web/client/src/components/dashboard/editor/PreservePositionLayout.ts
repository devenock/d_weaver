import { Point } from "fabric";
import { LayoutStrategy } from "fabric";
import type { FabricObject } from "fabric";
import type { StrictLayoutContext, LayoutStrategyResult } from "fabric";

/**
 * Layout strategy that keeps child positions unchanged when a group is created.
 * Fabric's default FitContentLayout repositions children so the group center is at (0,0),
 * which made labels and icons render outside the shape. This strategy returns center (0,0)
 * for initialization so no offset is applied and label/icon stay inside the shape.
 */
export class PreservePositionLayoutStrategy extends LayoutStrategy {
  static override readonly type = "preserve-position";

  override calcBoundingBox(
    objects: FabricObject[],
    context: StrictLayoutContext
  ): LayoutStrategyResult | undefined {
    const result = super.calcBoundingBox(objects, context);
    if (result && context.type === "initialization") {
      return { ...result, center: new Point(0, 0) };
    }
    return result;
  }
}
