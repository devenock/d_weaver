import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Copy,
  Sparkles,
  Grid3X3,
  FileImage,
  FileJson,
  Users,
  Save,
  Share2,
  ChevronDown,
  MoreHorizontal,
  FileUp,
  Cloud,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import mermaid from "mermaid";
import { toast } from "sonner";
import TemplatesGallery from "@/components/TemplatesGallery";
import AIGenerateDialog from "@/components/AIGenerateDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { CloudIconsLibrary } from "@/components/CloudIconsLibrary";
import { exportAsSVG, exportAsPNG, exportAsJSON } from "@/utils/exportUtils";
import { useCollaboration } from "@/hooks/useCollaboration";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { DiagramComments } from "@/components/DiagramComments";
import {
  DiagramCustomizer,
  CustomColors,
} from "@/components/DiagramCustomizer";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const DIAGRAM_TYPES = [
  {
    value: "flowchart",
    label: "Flowchart",
    example:
      "flowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action]\n    B -->|No| D[End]\n    C --> D",
  },
  {
    value: "sequence",
    label: "Sequence Diagram",
    example:
      "sequenceDiagram\n    participant User\n    participant System\n    User->>System: Request\n    System-->>User: Response",
  },
  {
    value: "class",
    label: "Class Diagram",
    example:
      "classDiagram\n    class User {\n        +String name\n        +String email\n        +login()\n    }",
  },
  {
    value: "state",
    label: "State Diagram",
    example:
      "stateDiagram-v2\n    [*] --> Idle\n    Idle --> Processing\n    Processing --> Complete\n    Complete --> [*]",
  },
  {
    value: "er",
    label: "ER Diagram",
    example:
      "erDiagram\n    USER ||--o{ ORDER : places\n    ORDER ||--|{ ITEM : contains",
  },
  {
    value: "gantt",
    label: "Gantt Chart",
    example:
      "gantt\n    title Project Timeline\n    section Phase 1\n    Task 1: 2024-01-01, 7d\n    Task 2: 2024-01-08, 5d",
  },
  {
    value: "c4context",
    label: "C4 Context",
    example:
      'C4Context\n    title System Context diagram for Internet Banking System\n    Person(customer, "Banking Customer", "A customer of the bank")\n    System(banking_system, "Internet Banking System", "Allows customers to view information")\n    System_Ext(email_system, "E-mail system", "The internal Microsoft Exchange system")\n    Rel(customer, banking_system, "Uses")\n    Rel(banking_system, email_system, "Sends e-mails", "SMTP")',
  },
  {
    value: "c4container",
    label: "C4 Container",
    example:
      'C4Container\n    title Container diagram for Internet Banking System\n    Person(customer, "Customer", "A customer")\n    Container(web_app, "Web Application", "Java, Spring MVC", "Delivers the static content")\n    Container(spa, "Single-Page App", "JavaScript, Angular", "Provides banking functionality")\n    ContainerDb(database, "Database", "SQL Database", "Stores user data")\n    Rel(customer, web_app, "Uses", "HTTPS")\n    Rel(customer, spa, "Uses", "HTTPS")\n    Rel(spa, web_app, "Makes API calls to", "async, JSON/HTTPS")\n    Rel(web_app, database, "Reads from and writes to", "JDBC")',
  },
  {
    value: "c4component",
    label: "C4 Component",
    example:
      'C4Component\n    title Component diagram for Internet Banking System\n    Container(spa, "Single Page Application", "javascript and angular", "Provides all the internet banking functionality")\n    Component(signinController, "Sign In Controller", "MVC Rest Controller", "Allows users to sign in")\n    Component(accountsController, "Accounts Summary Controller", "MVC Rest Controller", "Provides customers with summary")\n    Component(securityComponent, "Security Component", "Spring Bean", "Provides functionality related to signing in")\n    Rel(spa, signinController, "Makes API calls to", "JSON/HTTPS")\n    Rel(spa, accountsController, "Makes API calls to", "JSON/HTTPS")',
  },
  {
    value: "c4dynamic",
    label: "C4 Dynamic",
    example:
      'C4Dynamic\n    title Dynamic diagram for Internet Banking System\n    ContainerDb(database, "Database", "Relational Database Schema", "Stores user data")\n    Container(api, "API Application", "Java, Docker Container", "Provides API")\n    Container(spa, "Single Page Application", "JavaScript, Angular", "Provides banking functionality")\n    Rel(spa, api, "Makes API calls to", "JSON/HTTPS")\n    Rel(api, database, "Reads from and writes to", "SQL/TCP")',
  },
  {
    value: "c4deployment",
    label: "C4 Deployment",
    example:
      'C4Deployment\n    title Deployment Diagram for Internet Banking System\n    Deployment_Node(aws, "AWS", "Amazon Web Services"){\n        Deployment_Node(ec2, "EC2", "Virtual Servers"){\n            Container(api, "API Application", "Java", "Provides API")\n        }\n        Deployment_Node(rds, "RDS", "Managed Database"){\n            ContainerDb(database, "Database", "PostgreSQL")\n        }\n    }',
  },
  {
    value: "gitgraph",
    label: "Git Graph",
    example:
      "gitGraph\n    commit\n    commit\n    branch develop\n    checkout develop\n    commit\n    commit\n    checkout main\n    merge develop\n    commit",
  },
  {
    value: "mindmap",
    label: "Mind Map",
    example:
      "mindmap\n  root((Project))\n    Planning\n      Requirements\n      Timeline\n      Resources\n    Development\n      Frontend\n      Backend\n      Testing\n    Deployment\n      Staging\n      Production",
  },
  {
    value: "timeline",
    label: "Timeline",
    example:
      "timeline\n    title Project History\n    2023 : Project Initiated\n    2024-Q1 : Alpha Release\n    2024-Q2 : Beta Release\n    2024-Q3 : Public Launch",
  },
  {
    value: "journey",
    label: "User Journey",
    example:
      "journey\n    title User Journey Map\n    section Discovery\n      Find Website: 5: User\n      Browse Features: 4: User\n    section Engagement\n      Sign Up: 3: User\n      First Use: 5: User\n    section Retention\n      Daily Usage: 4: User",
  },
  {
    value: "quadrant",
    label: "Quadrant Chart",
    example:
      "quadrantChart\n    title Feature Prioritization\n    x-axis Low Effort --> High Effort\n    y-axis Low Impact --> High Impact\n    quadrant-1 Do First\n    quadrant-2 Plan for Later\n    quadrant-3 Low Priority\n    quadrant-4 Quick Wins\n    Feature A: [0.3, 0.7]\n    Feature B: [0.7, 0.8]\n    Feature C: [0.6, 0.3]\n    Feature D: [0.2, 0.2]",
  },
  {
    value: "requirement",
    label: "Requirement Diagram",
    example:
      "requirementDiagram\n    requirement user_req {\n        id: 1\n        text: The system shall authenticate users\n        risk: high\n        verifymethod: test\n    }\n    element login_system {\n        type: system\n    }\n    login_system - satisfies -> user_req",
  },
  {
    value: "pie",
    label: "Pie Chart",
    example:
      'pie title Technology Usage\n    "React" : 45\n    "Vue" : 25\n    "Angular" : 15\n    "Svelte" : 10\n    "Other" : 5',
  },
  {
    value: "architecture",
    label: "Architecture Diagram",
    example:
      'graph TB\n    subgraph "Frontend Layer"\n        UI[User Interface]\n        Cache[Client Cache]\n    end\n    subgraph "Backend Layer"\n        API[API Gateway]\n        Auth[Auth Service]\n        Logic[Business Logic]\n    end\n    subgraph "Data Layer"\n        DB[(Database)]\n        Queue[Message Queue]\n    end\n    UI --> Cache\n    Cache --> API\n    API --> Auth\n    API --> Logic\n    Logic --> DB\n    Logic --> Queue',
  },
];

const Editor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [diagramType, setDiagramType] = useState("flowchart");
  const [markdownInput, setMarkdownInput] = useState(DIAGRAM_TYPES[0].example);
  const [isSmartParse, setIsSmartParse] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showCloudIcons, setShowCloudIcons] = useState(false);
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
  const [diagramTitle, setDiagramTitle] = useState("Untitled Diagram");
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<
    "default" | "dark" | "forest" | "neutral" | "base"
  >("default");
  const [customColors, setCustomColors] = useState<CustomColors>({});
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const [isPublic, setIsPublic] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);
  const { collaborators } = useCollaboration(currentDiagramId);
  const { workspaces, currentWorkspace } = useWorkspaces();

  // Set initial workspace from current workspace
  useEffect(() => {
    if (currentWorkspace && !selectedWorkspaceId) {
      setSelectedWorkspaceId(currentWorkspace.id);
    }
  }, [currentWorkspace, selectedWorkspaceId]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: currentTheme,
      securityLevel: "loose",
      themeVariables: customColors,
    });
  }, [currentTheme, customColors]);

  useEffect(() => {
    renderDiagram();
  }, [markdownInput]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const diagramId = searchParams.get("diagramId");
    if (diagramId) {
      loadDiagram(diagramId);
    }
  }, [searchParams]);

  const loadDiagram = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("diagrams")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setMarkdownInput(data.content);
        setDiagramTitle(data.title);
        setCurrentDiagramId(data.id);
        setIsPublic(data.is_public || false);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderDiagram = async () => {
    if (!diagramRef.current || !markdownInput.trim()) return;

    try {
      mermaid.initialize({
        startOnLoad: true,
        theme: currentTheme,
        securityLevel: "loose",
        themeVariables: customColors,
      });

      const { svg } = await mermaid.render("mermaid-diagram", markdownInput);
      diagramRef.current.innerHTML = svg;
    } catch (error) {
      console.error("Diagram rendering error:", error);
      diagramRef.current.innerHTML =
        '<div class="text-destructive p-4">Invalid diagram syntax. Please check your markdown.</div>';
    }
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(
      theme as "default" | "dark" | "forest" | "neutral" | "base",
    );
  };

  const handleCustomColorsChange = (colors: CustomColors) => {
    setCustomColors(colors);
  };

  const handleDiagramTypeChange = (value: string) => {
    setDiagramType(value);
    const example = DIAGRAM_TYPES.find((t) => t.value === value)?.example || "";
    setMarkdownInput(example);
  };

  const parseMarkdownToDiagram = (markdown: string): string => {
    if (
      markdown
        .trim()
        .match(
          /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|gitGraph|mindmap|timeline|journey|pie|quadrantChart|requirementDiagram|C4)/,
        )
    ) {
      return markdown;
    }

    const lines = markdown.split("\n").filter((line) => line.trim());
    let mermaidCode = "flowchart TD\n";
    let nodeId = 0;
    const nodeMap = new Map<string, string>();

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("# ")) {
        const text = trimmed.substring(2);
        const id = `N${nodeId++}`;
        nodeMap.set(text, id);
        mermaidCode += `    ${id}[${text}]\n`;
      } else if (trimmed.startsWith("## ")) {
        const text = trimmed.substring(3);
        const id = `N${nodeId++}`;
        const lastNode = Array.from(nodeMap.values()).pop();
        if (lastNode) {
          mermaidCode += `    ${id}[${text}]\n`;
          mermaidCode += `    ${lastNode} --> ${id}\n`;
        }
        nodeMap.set(text, id);
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const text = trimmed.substring(2);
        const id = `N${nodeId++}`;
        const lastNode = Array.from(nodeMap.values()).pop();
        if (lastNode) {
          mermaidCode += `    ${id}[${text}]\n`;
          mermaidCode += `    ${lastNode} --> ${id}\n`;
        }
      }
    }

    return (
      mermaidCode ||
      "flowchart TD\n    A[Start] --> B[Enter markdown content]\n    B --> C[Diagram will be generated]"
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const parsedContent = isSmartParse
          ? parseMarkdownToDiagram(content)
          : content;
        setMarkdownInput(parsedContent);
        toast.success(
          `File uploaded${isSmartParse ? " and parsed" : ""} successfully!`,
        );
      };
      reader.readAsText(file);
    }
  };

  const handleTemplateSelect = (code: string, type: string) => {
    setMarkdownInput(code);
    const matchedType = DIAGRAM_TYPES.find((t) => t.value === type);
    if (matchedType) {
      setDiagramType(matchedType.value);
    }
  };

  const handleAIGenerate = (diagram: string) => {
    setMarkdownInput(diagram);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownInput);
    toast.success("Markdown copied to clipboard!");
  };

  const handleSaveDiagram = async () => {
    if (!user) {
      toast.error("Please sign in to save diagrams");
      navigate("/auth");
      return;
    }

    setSaving(true);

    try {
      const svgElement = diagramRef.current?.querySelector("svg");
      if (!svgElement) {
        toast.error("No diagram to save");
        setSaving(false);
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
      const dataURL = `data:image/svg+xml;base64,${svgBase64}`;

      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataURL;
      });

      const canvas = document.createElement("canvas");
      const bbox = svgElement.getBBox();
      canvas.width = bbox.width * 2;
      canvas.height = bbox.height * 2;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);

      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create image blob"));
        }, "image/png");
      });

      const fileName = `${user.id}/${Date.now()}-${diagramTitle.replace(/[^a-z0-9]/gi, "_")}.png`;
      const { error: uploadError } = await supabase.storage
        .from("diagrams")
        .upload(fileName, imageBlob, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("diagrams").getPublicUrl(fileName);

      const diagramTypeValue = markdownInput
        .trim()
        .split("\n")[0]
        .split(" ")[0];

      if (currentDiagramId) {
        const { error } = await supabase
          .from("diagrams")
          .update({
            title: diagramTitle,
            content: markdownInput,
            diagram_type: diagramTypeValue,
            image_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentDiagramId);

        if (error) throw error;

        toast.success("Diagram updated successfully");
      } else {
        const { data, error } = await supabase
          .from("diagrams")
          .insert({
            title: diagramTitle,
            content: markdownInput,
            diagram_type: diagramTypeValue,
            image_url: publicUrl,
            user_id: user.id,
            workspace_id: selectedWorkspaceId,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setCurrentDiagramId(data.id);
        }

        toast.success("Diagram saved successfully");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-6">
        {/* Top Action Bar - Clean and focused */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              value={diagramTitle}
              onChange={(e) => setDiagramTitle(e.target.value)}
              placeholder="Diagram title..."
              className="text-lg font-medium h-12 border-none shadow-none px-0 focus-visible:ring-0 bg-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Actions - Always visible */}
            <Button onClick={() => setShowAIDialog(true)} className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Generate</span>
            </Button>

            {user && (
              <Button
                onClick={handleSaveDiagram}
                disabled={saving}
                variant="secondary"
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {saving ? "Saving..." : "Save"}
                </span>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setShowShareDialog(true)}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => exportAsSVG(diagramRef.current, diagramTitle)}
                >
                  <FileImage className="w-4 h-4 mr-2" />
                  Export as SVG
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportAsPNG(diagramRef.current, diagramTitle)}
                >
                  <FileImage className="w-4 h-4 mr-2" />
                  Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportAsJSON(markdownInput, diagramType, diagramTitle)
                  }
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowCloudIcons(true)}>
                  <Cloud className="w-4 h-4 mr-2" />
                  Cloud Icons
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTemplates(true)}>
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Templates
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Markdown
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <label className="cursor-pointer">
                    <FileUp className="w-4 h-4 mr-2" />
                    Upload File
                    <input
                      type="file"
                      accept=".md,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Collaborators indicator */}
        {collaborators.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 px-1">
            <Users className="w-4 h-4" />
            <span>
              {collaborators.length} collaborator
              {collaborators.length !== 1 ? "s" : ""} viewing
            </span>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Editor */}
          <div className="space-y-4">
            <Card className="p-4 shadow-sm">
              {/* Diagram Type - Compact */}
              <div className="mb-4">
                <Select
                  value={diagramType}
                  onValueChange={handleDiagramTypeChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select diagram type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="flowchart">Flowchart</SelectItem>
                    <SelectItem value="sequence">Sequence Diagram</SelectItem>
                    <SelectItem value="class">Class Diagram</SelectItem>
                    <SelectItem value="state">State Diagram</SelectItem>
                    <SelectItem value="er">ER Diagram</SelectItem>
                    <SelectItem value="gantt">Gantt Chart</SelectItem>
                    <DropdownMenuSeparator />
                    <SelectItem value="c4context">C4 Context</SelectItem>
                    <SelectItem value="c4container">C4 Container</SelectItem>
                    <SelectItem value="c4component">C4 Component</SelectItem>
                    <SelectItem value="c4dynamic">C4 Dynamic</SelectItem>
                    <SelectItem value="c4deployment">C4 Deployment</SelectItem>
                    <DropdownMenuSeparator />
                    <SelectItem value="mindmap">Mind Map</SelectItem>
                    <SelectItem value="timeline">Timeline</SelectItem>
                    <SelectItem value="journey">User Journey</SelectItem>
                    <SelectItem value="gitgraph">Git Graph</SelectItem>
                    <SelectItem value="quadrant">Quadrant Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="requirement">
                      Requirement Diagram
                    </SelectItem>
                    <SelectItem value="architecture">
                      Architecture Diagram
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Code Editor */}
              <Textarea
                value={markdownInput}
                onChange={(e) => setMarkdownInput(e.target.value)}
                placeholder="Enter your Mermaid markdown here..."
                className="min-h-[400px] font-mono text-sm resize-none"
              />

              {/* Advanced Options - Collapsible */}
              <Collapsible
                open={showAdvanced}
                onOpenChange={setShowAdvanced}
                className="mt-4"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                  >
                    Advanced Options
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Smart Parse Toggle */}
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                    <input
                      type="checkbox"
                      id="smart-parse"
                      checked={isSmartParse}
                      onChange={(e) => setIsSmartParse(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label
                      htmlFor="smart-parse"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Smart Parse Mode (Converts plain markdown to diagrams)
                    </label>
                  </div>

                  {/* Workspace Selector */}
                  {user && workspaces.length > 0 && (
                    <div>
                      <Label className="text-sm mb-2 block">
                        Save to Workspace
                      </Label>
                      <Select
                        value={selectedWorkspaceId || "personal"}
                        onValueChange={(v) =>
                          setSelectedWorkspaceId(v === "personal" ? null : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select workspace" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">
                            Personal (No Workspace)
                          </SelectItem>
                          {workspaces.map((ws) => (
                            <SelectItem key={ws.id} value={ws.id}>
                              {ws.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Customizer - Compact */}
            <DiagramCustomizer
              onThemeChange={handleThemeChange}
              onCustomColorsChange={handleCustomColorsChange}
            />
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-4">
            <Card className="p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Preview</h2>
              </div>

              <div
                ref={diagramRef}
                className="min-h-[400px] border border-border rounded-lg p-4 bg-background flex items-center justify-center overflow-auto"
              >
                <p className="text-muted-foreground">
                  Your diagram will appear here...
                </p>
              </div>
            </Card>

            {/* Comments */}
            <DiagramComments diagramId={currentDiagramId} user={user} />
          </div>
        </div>
      </main>

      {showTemplates && (
        <TemplatesGallery
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}

      <AIGenerateDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        onGenerate={handleAIGenerate}
      />

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        diagramId={currentDiagramId}
        diagramTitle={diagramTitle}
        isPublic={isPublic}
        onVisibilityChange={setIsPublic}
      />

      <CloudIconsLibrary
        open={showCloudIcons}
        onOpenChange={setShowCloudIcons}
        onInsertIcon={(code) =>
          setMarkdownInput((prev) => prev + "\n    " + code)
        }
      />
    </div>
  );
};

export default Editor;
