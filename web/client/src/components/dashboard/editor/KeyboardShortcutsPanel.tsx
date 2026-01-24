import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["⌘/Ctrl", "S"], description: "Save diagram" },
      { keys: ["Escape"], description: "Deselect / Cancel" },
      { keys: ["V"], description: "Select tool" },
    ],
  },
  {
    title: "Edit",
    shortcuts: [
      { keys: ["⌘/Ctrl", "Z"], description: "Undo" },
      { keys: ["⌘/Ctrl", "Shift", "Z"], description: "Redo" },
      { keys: ["⌘/Ctrl", "Y"], description: "Redo (alternative)" },
      { keys: ["Delete"], description: "Delete selected" },
      { keys: ["Backspace"], description: "Delete selected" },
      { keys: ["⌘/Ctrl", "D"], description: "Duplicate selected" },
    ],
  },
  {
    title: "Grouping",
    shortcuts: [
      { keys: ["⌘/Ctrl", "G"], description: "Group selected objects" },
      { keys: ["⌘/Ctrl", "Shift", "G"], description: "Ungroup selected" },
    ],
  },
  {
    title: "Canvas",
    shortcuts: [
      { keys: ["Scroll"], description: "Pan canvas" },
      { keys: ["⌘/Ctrl", "+"], description: "Zoom in (via buttons)" },
      { keys: ["⌘/Ctrl", "-"], description: "Zoom out (via buttons)" },
    ],
  },
];

export function KeyboardShortcutsPanel({ open, onOpenChange }: KeyboardShortcutsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-foreground mb-3">
                {group.title}
              </h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-medium bg-muted border border-border rounded">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-muted border border-border rounded mx-1">?</kbd> to toggle this panel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
