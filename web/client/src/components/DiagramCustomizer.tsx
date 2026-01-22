import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface DiagramCustomizerProps {
  onThemeChange: (theme: string) => void;
  onCustomColorsChange: (colors: CustomColors) => void;
}

export interface CustomColors {
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  primaryTextColor?: string;
  secondaryTextColor?: string;
  primaryBorderColor?: string;
}

const MERMAID_THEMES = [
  { value: "default", label: "Default" },
  { value: "dark", label: "Dark" },
  { value: "forest", label: "Forest" },
  { value: "neutral", label: "Neutral" },
  { value: "base", label: "Base" },
];

export const DiagramCustomizer = ({ onThemeChange, onCustomColorsChange }: DiagramCustomizerProps) => {
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [tertiaryColor, setTertiaryColor] = useState("#ec4899");
  const [textColor, setTextColor] = useState("#1e293b");
  const [borderColor, setBorderColor] = useState("#64748b");

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    onThemeChange(theme);
    toast.success(`Theme changed to ${theme}`);
  };

  const handleApplyCustomColors = () => {
    const colors: CustomColors = {
      primaryColor,
      secondaryColor,
      tertiaryColor,
      primaryTextColor: textColor,
      secondaryTextColor: textColor,
      primaryBorderColor: borderColor,
    };
    onCustomColorsChange(colors);
    toast.success("Custom colors applied");
  };

  const handleReset = () => {
    setPrimaryColor("#0ea5e9");
    setSecondaryColor("#8b5cf6");
    setTertiaryColor("#ec4899");
    setTextColor("#1e293b");
    setBorderColor("#64748b");
    setSelectedTheme("default");
    onThemeChange("default");
    toast.success("Reset to default theme");
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Customize Diagram</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="theme-select" className="mb-2 block">
            Select Theme
          </Label>
          <Select value={selectedTheme} onValueChange={handleThemeChange}>
            <SelectTrigger id="theme-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MERMAID_THEMES.map((theme) => (
                <SelectItem key={theme.value} value={theme.value}>
                  {theme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border pt-4">
          <Label className="mb-3 block text-sm font-medium">Custom Colors</Label>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="primary-color" className="text-xs mb-1 block">
                  Primary
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-16 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondary-color" className="text-xs mb-1 block">
                  Secondary
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary-color"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-16 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tertiary-color" className="text-xs mb-1 block">
                  Tertiary
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="tertiary-color"
                    type="color"
                    value={tertiaryColor}
                    onChange={(e) => setTertiaryColor(e.target.value)}
                    className="h-10 w-16 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={tertiaryColor}
                    onChange={(e) => setTertiaryColor(e.target.value)}
                    className="h-10 flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="text-color" className="text-xs mb-1 block">
                  Text
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="text-color"
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-10 w-16 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-10 flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <Label htmlFor="border-color" className="text-xs mb-1 block">
                  Border
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="border-color"
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="h-10 w-16 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="h-10 flex-1 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleApplyCustomColors} size="sm" className="flex-1">
                Apply Colors
              </Button>
              <Button onClick={handleReset} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
