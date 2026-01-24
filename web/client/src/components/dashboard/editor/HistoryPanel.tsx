import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock, X, Undo, Redo, ChevronRight } from "lucide-react";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: string[];
  currentStep: number;
  onJumpToStep: (step: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryPanel({
  isOpen,
  onClose,
  history,
  currentStep,
  onJumpToStep,
  onUndo,
  onRedo,
}: HistoryPanelProps) {
  const formatStepLabel = (index: number, total: number) => {
    if (index === 0) return "Initial state";
    if (index === total - 1) return "Latest change";
    return `Change ${index}`;
  };

  const getTimeAgo = (index: number, total: number) => {
    // Estimate time based on position in history
    const stepsAgo = total - 1 - index;
    if (stepsAgo === 0) return "Now";
    if (stepsAgo === 1) return "1 step ago";
    return `${stepsAgo} steps ago`;
  };

  return (
    <div
      className={`absolute top-0 left-0 h-full w-64 lg:w-72 bg-background border-r border-border shadow-2xl flex flex-col z-30 transition-transform duration-300 ease-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between px-3 lg:px-4 py-2 lg:py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-xs lg:text-sm">History</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 lg:h-7 lg:w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
        </Button>
      </div>

      {/* Undo/Redo buttons */}
      <div className="flex gap-2 p-3 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={onUndo}
          disabled={currentStep === 0}
        >
          <Undo className="w-3.5 h-3.5 mr-1" />
          Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={onRedo}
          disabled={currentStep >= history.length - 1}
        >
          <Redo className="w-3.5 h-3.5 mr-1" />
          Redo
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {history.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No history yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {[...history].reverse().map((_, reverseIndex) => {
                const index = history.length - 1 - reverseIndex;
                const isCurrent = index === currentStep;
                
                return (
                  <button
                    key={index}
                    onClick={() => onJumpToStep(index)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors ${
                      isCurrent
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isCurrent ? "bg-primary" : "bg-muted-foreground/30"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isCurrent ? "text-primary" : ""}`}>
                        {formatStepLabel(index, history.length)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {getTimeAgo(index, history.length)}
                      </p>
                    </div>
                    {isCurrent && (
                      <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          {history.length} {history.length === 1 ? "state" : "states"} • Step {currentStep + 1} of {history.length}
        </p>
      </div>
    </div>
  );
}
