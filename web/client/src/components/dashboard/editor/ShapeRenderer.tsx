import React from 'react';
import {
  Server,
  Database,
  Cloud,
  Zap,
  Cpu,
  Router,
  HardDrive,
  Lock,
  Shield,
  Settings,
  Monitor,
  Smartphone,
  Globe,
  FileText,
  Folder,
} from 'lucide-react';

// SVG icons for rendering inside fabric shapes
export const SHAPE_SVG_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  server: Server,
  database: Database,
  cloud: Cloud,
  api: Zap,
  cpu: Cpu,
  router: Router,
  storage: HardDrive,
  security: Lock,
  shield: Shield,
  config: Settings,
  desktop: Monitor,
  mobile: Smartphone,
  web: Globe,
  document: FileText,
  folder: Folder,
};

// Generate SVG path data for icons
export function getIconSvgPath(iconType: string): string {
  // These are simplified SVG paths for common icons
  switch (iconType) {
    case 'server':
      return 'M4 4h16v4H4zM4 10h16v4H4zM4 16h16v4H4z M7 6h2 M7 12h2 M7 18h2';
    case 'database':
      return 'M12 2C6.48 2 2 3.79 2 6v12c0 2.21 4.48 4 10 4s10-1.79 10-4V6c0-2.21-4.48-4-10-4z M2 6c0 2.21 4.48 4 10 4s10-1.79 10-4 M2 12c0 2.21 4.48 4 10 4s10-1.79 10-4';
    case 'cloud':
      return 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z';
    case 'api':
      return 'M13 2L3 14h9l-1 8 10-12h-9l1-8z';
    case 'cpu':
      return 'M4 4h16v16H4z M9 1v3 M15 1v3 M9 20v3 M15 20v3 M1 9h3 M1 15h3 M20 9h3 M20 15h3 M9 9h6v6H9z';
    case 'router':
      return 'M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01';
    case 'storage':
      return 'M22 12H2 M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z M6 16h.01';
    case 'security':
    case 'lock':
      return 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4';
    case 'shield':
      return 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z';
    case 'config':
      return 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z';
    case 'desktop':
      return 'M20 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z M8 21h8 M12 17v4';
    case 'mobile':
      return 'M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z M12 18h.01';
    case 'web':
      return 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z';
    case 'document':
      return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8';
    case 'folder':
      return 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z';
    default:
      return '';
  }
}

// Create an SVG data URL for use in fabric.js
export function createIconDataUrl(
  iconType: string, 
  fillColor: string = '#ffffff',
  size: number = 40
): string {
  const iconPaths: Record<string, string> = {
    server: `
      <rect x="4" y="2" width="16" height="5" rx="1" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <rect x="4" y="9.5" width="16" height="5" rx="1" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <rect x="4" y="17" width="16" height="5" rx="1" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <circle cx="7" cy="4.5" r="1" fill="${fillColor}"/>
      <circle cx="7" cy="12" r="1" fill="${fillColor}"/>
      <circle cx="7" cy="19.5" r="1" fill="${fillColor}"/>
    `,
    database: `
      <ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <path d="M21 5v6c0 1.66-4.03 3-9 3S3 12.66 3 11V5" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <path d="M21 11v6c0 1.66-4.03 3-9 3s-9-1.34-9-3v-6" fill="none" stroke="${fillColor}" stroke-width="2"/>
    `,
    cloud: `
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="none" stroke="${fillColor}" stroke-width="2"/>
    `,
    api: `
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" fill="none" stroke="${fillColor}" stroke-width="2"/>
    `,
    cpu: `
      <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <rect x="9" y="9" width="6" height="6" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <line x1="9" y1="1" x2="9" y2="4" stroke="${fillColor}" stroke-width="2"/>
      <line x1="15" y1="1" x2="15" y2="4" stroke="${fillColor}" stroke-width="2"/>
      <line x1="9" y1="20" x2="9" y2="23" stroke="${fillColor}" stroke-width="2"/>
      <line x1="15" y1="20" x2="15" y2="23" stroke="${fillColor}" stroke-width="2"/>
      <line x1="1" y1="9" x2="4" y2="9" stroke="${fillColor}" stroke-width="2"/>
      <line x1="1" y1="15" x2="4" y2="15" stroke="${fillColor}" stroke-width="2"/>
      <line x1="20" y1="9" x2="23" y2="9" stroke="${fillColor}" stroke-width="2"/>
      <line x1="20" y1="15" x2="23" y2="15" stroke="${fillColor}" stroke-width="2"/>
    `,
    router: `
      <path d="M5 12.55a11 11 0 0 1 14.08 0" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <circle cx="12" cy="20" r="1" fill="${fillColor}"/>
    `,
    storage: `
      <path d="M22 12H2" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <circle cx="6" cy="16" r="1" fill="${fillColor}"/>
    `,
    security: `
      <rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="${fillColor}" stroke-width="2"/>
    `,
    shield: `
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="${fillColor}" stroke-width="2"/>
    `,
    config: `
      <circle cx="12" cy="12" r="3" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="${fillColor}" stroke-width="2"/>
    `,
    desktop: `
      <rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <line x1="8" y1="21" x2="16" y2="21" stroke="${fillColor}" stroke-width="2"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="${fillColor}" stroke-width="2"/>
    `,
    mobile: `
      <rect x="5" y="2" width="14" height="20" rx="2" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <circle cx="12" cy="18" r="1" fill="${fillColor}"/>
    `,
    web: `
      <circle cx="12" cy="12" r="10" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <line x1="2" y1="12" x2="22" y2="12" stroke="${fillColor}" stroke-width="2"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="${fillColor}" stroke-width="2"/>
    `,
    document: `
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <path d="M14 2v6h6" fill="none" stroke="${fillColor}" stroke-width="2"/>
      <line x1="16" y1="13" x2="8" y2="13" stroke="${fillColor}" stroke-width="2"/>
      <line x1="16" y1="17" x2="8" y2="17" stroke="${fillColor}" stroke-width="2"/>
    `,
    folder: `
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="none" stroke="${fillColor}" stroke-width="2"/>
    `,
  };

  const svgContent = iconPaths[iconType] || '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">${svgContent}</svg>`;
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
