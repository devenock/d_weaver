import { toast } from "sonner";

export const exportAsSVG = (
  diagramRef: HTMLDivElement | null,
  filename: string = "diagram",
) => {
  const svgElement = diagramRef?.querySelector("svg");
  if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("SVG downloaded!");
    return true;
  }
  toast.error("No diagram to export");
  return false;
};

export const exportAsPNG = async (
  diagramRef: HTMLDivElement | null,
  filename: string = "diagram",
) => {
  const svgElement = diagramRef?.querySelector("svg");
  if (!svgElement) {
    toast.error("No diagram to export");
    return false;
  }

  try {
    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;

    // Get the full SVG dimensions including viewBox
    const viewBox = clonedSvg.getAttribute("viewBox");
    let width = parseFloat(clonedSvg.getAttribute("width") || "800");
    let height = parseFloat(clonedSvg.getAttribute("height") || "600");

    if (viewBox) {
      const [, , vbWidth, vbHeight] = viewBox.split(" ").map(Number);
      width = vbWidth || width;
      height = vbHeight || height;
    }

    // Add padding to ensure nothing is cut off
    const padding = 40;
    width = width + padding * 2;
    height = height + padding * 2;

    // Ensure SVG has proper dimensions set
    clonedSvg.setAttribute("width", String(width));
    clonedSvg.setAttribute("height", String(height));

    // Adjust viewBox to include padding
    if (viewBox) {
      const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(" ").map(Number);
      clonedSvg.setAttribute(
        "viewBox",
        `${vbX - padding} ${vbY - padding} ${vbWidth + padding * 2} ${vbHeight + padding * 2}`,
      );
    }

    // Get SVG data and convert to data URL to avoid CORS issues
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
    const dataURL = `data:image/svg+xml;base64,${svgBase64}`;

    // Create an image
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataURL;
    });

    // Create canvas with proper dimensions
    const canvas = document.createElement("canvas");
    const scale = 2; // 2x for better quality
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    // Set white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image with scaling
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to PNG
    canvas.toBlob((blob) => {
      if (blob) {
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `${filename}.png`;
        link.click();
        URL.revokeObjectURL(pngUrl);
        toast.success("PNG downloaded!");
      }
    }, "image/png");

    return true;
  } catch (error) {
    console.error("Error exporting PNG:", error);
    toast.error("Failed to export PNG");
    return false;
  }
};

export const exportAsPDF = async (
  diagramRef: HTMLDivElement | null,
  filename: string = "diagram",
) => {
  toast.info(
    "PDF export requires a premium library. Downloading as SVG instead.",
  );
  return exportAsSVG(diagramRef, filename);
};

export const exportAsJSON = (
  markdownContent: string,
  diagramType: string,
  filename: string = "diagram",
) => {
  const data = {
    type: diagramType,
    content: markdownContent,
    exportedAt: new Date().toISOString(),
    version: "1.0",
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("JSON downloaded!");
  return true;
};
