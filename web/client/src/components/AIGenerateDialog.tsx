import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (diagram: string) => void;
}

const DIAGRAM_TYPES = [
  { value: "auto", label: "Auto-detect (Recommended)" },
  { value: "flowchart", label: "Flowchart" },
  { value: "sequence", label: "Sequence Diagram" },
  { value: "class", label: "Class Diagram" },
  { value: "er", label: "ER Diagram" },
  { value: "architecture", label: "Architecture Diagram" },
  { value: "state", label: "State Diagram" },
  { value: "gantt", label: "Gantt Chart" },
];

const AIGenerateDialog = ({ open, onOpenChange, onGenerate }: AIGenerateDialogProps) => {
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState("auto");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram', {
        body: { 
          description: description.trim(),
          diagramType: selectedType === "auto" ? null : selectedType
        }
      });

      if (error) throw error;

      if (data?.diagram) {
        onGenerate(data.diagram);
        toast.success("Diagram generated successfully!");
        onOpenChange(false);
        setDescription("");
      } else {
        throw new Error("No diagram returned");
      }
    } catch (error: any) {
      console.error("Error generating diagram:", error);
      if (error.message?.includes('429')) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error.message?.includes('402')) {
        toast.error("Payment required. Please add credits to your workspace.");
      } else {
        toast.error("Failed to generate diagram. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <DialogTitle>AI Diagram Generator</DialogTitle>
          </div>
          <DialogDescription>
            Describe what you want to visualize and AI will create a professional diagram for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Diagram Type</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAGRAM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: Create a flowchart showing the user authentication process with login, signup, password reset, and email verification..."
              className="min-h-[150px]"
              disabled={isGenerating}
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-1">Tips for better results:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Be specific about the process or system you want to visualize</li>
              <li>Mention key components, steps, or entities</li>
              <li>Include relationships or connections between elements</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Diagram
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIGenerateDialog;