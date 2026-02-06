import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Grid3X3, Search } from "lucide-react";
import mermaid from "mermaid";

// Professional color palette for Mermaid previews (Creately-style variety)
const MERMAID_THEME = {
  theme: "base" as const,
  themeVariables: {
    primaryColor: "#6366f1",
    primaryTextColor: "#fff",
    primaryBorderColor: "#4f46e5",
    secondaryColor: "#8b5cf6",
    tertiaryColor: "#ec4899",
    lineColor: "#64748b",
    secondaryBorderColor: "#7c3aed",
    tertiaryBorderColor: "#db2777",
    background: "#f8fafc",
    mainBkg: "#6366f1",
    secondBkg: "#8b5cf6",
    tertiaryBkg: "#14b8a6",
    nodeBorder: "#4f46e5",
    clusterBkg: "#e0e7ff",
    titleColor: "#1e293b",
    edgeLabelBackground: "#f1f5f9",
    nodeTextColor: "#fff",
    textColor: "#334155",
  },
};

function TemplatePreview({ code, id }: { code: string; id: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code.trim()) return;
    const renderId = `template-${id}-${Math.random().toString(36).slice(2, 9)}`;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      ...MERMAID_THEME,
    });
    mermaid
      .render(renderId, code)
      .then(({ svg: result }) => setSvg(result))
      .catch(() => setError(true));
  }, [code, id]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[140px] flex items-center justify-center rounded-lg bg-muted/50 border border-dashed">
        <span className="text-xs text-muted-foreground">Preview</span>
      </div>
    );
  }
  if (!svg) {
    return (
      <div className="w-full h-full min-h-[140px] flex items-center justify-center rounded-lg bg-muted/50 animate-pulse">
        <span className="text-xs text-muted-foreground">Loading…</span>
      </div>
    );
  }
  return (
    <div
      className="w-full h-full min-h-[140px] rounded-lg bg-[#f8fafc] border border-border overflow-hidden flex items-center justify-center p-2 [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:h-auto [&_svg]:w-auto [&_svg]:object-contain"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

const TEMPLATES = [
  {
    id: "microservices",
    name: "Microservices Architecture",
    type: "architecture",
    category: "Software & IT",
    code: `graph TB
    subgraph "Client Layer"
        Web[Web App]
        Mobile[Mobile App]
    end
    
    subgraph "API Gateway"
        Gateway[API Gateway]
    end
    
    subgraph "Services"
        Auth[Auth Service]
        User[User Service]
        Order[Order Service]
        Payment[Payment Service]
    end
    
    subgraph "Data Layer"
        AuthDB[(Auth DB)]
        UserDB[(User DB)]
        OrderDB[(Order DB)]
    end
    
    Web --> Gateway
    Mobile --> Gateway
    Gateway --> Auth
    Gateway --> User
    Gateway --> Order
    Gateway --> Payment
    Auth --> AuthDB
    User --> UserDB
    Order --> OrderDB
    Payment --> Order`
  },
  {
    id: "cicd",
    name: "CI/CD Pipeline",
    type: "flowchart",
    category: "Software & IT",
    code: `flowchart LR
    A[Code Commit] --> B[Build]
    B --> C{Tests Pass?}
    C -->|Yes| D[Security Scan]
    C -->|No| E[Notify Developer]
    D --> F{Vulnerabilities?}
    F -->|No| G[Deploy to Staging]
    F -->|Yes| E
    G --> H{Approval?}
    H -->|Yes| I[Deploy to Production]
    H -->|No| E
    I --> J[Monitor]`
  },
  {
    id: "user-auth",
    name: "User Authentication Flow",
    type: "sequence",
    category: "Software & IT",
    code: `sequenceDiagram
    participant U as User
    participant C as Client
    participant A as Auth Server
    participant D as Database
    
    U->>C: Enter credentials
    C->>A: POST /login
    A->>D: Verify credentials
    D-->>A: User data
    A->>A: Generate JWT
    A-->>C: Return token
    C->>C: Store token
    C-->>U: Login successful
    
    U->>C: Request protected resource
    C->>A: GET /resource (with token)
    A->>A: Validate token
    A-->>C: Return resource
    C-->>U: Display resource`
  },
  {
    id: "ecommerce-db",
    name: "E-Commerce Database",
    type: "er",
    category: "Data",
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : includes
    CUSTOMER ||--o{ PAYMENT : makes
    ORDER ||--|| PAYMENT : has
    PRODUCT ||--o{ CATEGORY : belongs_to
    
    CUSTOMER {
        uuid id PK
        string email
        string name
        timestamp created_at
    }
    
    ORDER {
        uuid id PK
        uuid customer_id FK
        decimal total
        string status
        timestamp created_at
    }
    
    PRODUCT {
        uuid id PK
        string name
        decimal price
        int stock
        uuid category_id FK
    }
    
    LINE_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal price
    }`
  },
  {
    id: "agile-sprint",
    name: "Agile Sprint Timeline",
    type: "gantt",
    category: "Planning",
    code: `gantt
    title Sprint Planning & Execution
    dateFormat YYYY-MM-DD
    section Planning
    Sprint Planning    :a1, 2024-01-01, 1d
    Backlog Refinement :a2, after a1, 1d
    section Development
    Feature A          :b1, after a2, 5d
    Feature B          :b2, after a2, 5d
    Feature C          :b3, after b1, 3d
    section Testing
    Unit Testing       :c1, after b1, 2d
    Integration Tests  :c2, after c1, 2d
    section Deployment
    Deploy to Staging  :d1, after c2, 1d
    UAT                :d2, after d1, 2d
    Production Deploy  :d3, after d2, 1d`
  },
  {
    id: "state-machine",
    name: "Order State Machine",
    type: "state",
    category: "Software & IT",
    code: `stateDiagram-v2
    [*] --> Draft
    Draft --> Pending: Submit Order
    Pending --> Processing: Payment Confirmed
    Processing --> Shipped: Items Packed
    Shipped --> Delivered: Delivery Confirmed
    Delivered --> [*]
    
    Pending --> Cancelled: Payment Failed
    Processing --> Cancelled: Out of Stock
    Cancelled --> [*]
    
    Draft --> Cancelled: User Cancels
    Pending --> Draft: Edit Order`
  },
  {
    id: "system-design",
    name: "Scalable Web Application",
    type: "c4context",
    category: "Software & IT",
    code: `C4Context
    title System Context - Social Media Platform
    
    Person(user, "User", "A user of the platform")
    Person(admin, "Administrator", "System administrator")
    
    System(webapp, "Web Application", "Main application platform")
    System_Ext(email, "Email Service", "SendGrid")
    System_Ext(storage, "Cloud Storage", "AWS S3")
    System_Ext(cdn, "CDN", "CloudFlare")
    System_Ext(analytics, "Analytics", "Google Analytics")
    
    Rel(user, webapp, "Uses", "HTTPS")
    Rel(admin, webapp, "Manages", "HTTPS")
    Rel(webapp, email, "Sends emails", "SMTP")
    Rel(webapp, storage, "Stores files", "S3 API")
    Rel(webapp, cdn, "Serves static content", "HTTP")
    Rel(webapp, analytics, "Sends events", "Analytics API")`
  },
  {
    id: "project-structure",
    name: "Project Component Structure",
    type: "mindmap",
    category: "Planning",
    code: `mindmap
  root((Web App))
    Frontend
      Components
        UI Components
        Page Components
        Layout Components
      State Management
        Redux
        Context API
      Routing
        React Router
    Backend
      API Layer
        REST API
        GraphQL
      Services
        Auth Service
        Data Service
        File Service
      Database
        PostgreSQL
        Redis Cache
    DevOps
      CI/CD
        GitHub Actions
        Docker
      Monitoring
        Logging
        Metrics
      Deployment
        Cloud Hosting
        Load Balancer`
  }
];

export interface TemplatesGalleryProps {
  onSelectTemplate: (code: string, type: string, name: string) => void;
  onClose: () => void;
}

const CATEGORIES = ["All", "Software & IT", "Data", "Planning"];

const TemplatesGallery = ({ onSelectTemplate, onClose }: TemplatesGalleryProps) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = TEMPLATES.filter((t) => {
    const matchSearch =
      !search.trim() ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(search.toLowerCase()));
    const matchCategory =
      category === "All" || (t.category && t.category === category);
    return matchSearch && matchCategory;
  });

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] p-6 shadow-card flex flex-col">
        <div className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Templates</h2>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-2 mb-4 flex-shrink-0">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "secondary" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {filtered.map((template) => (
              <Card
                key={template.id}
                className="overflow-hidden hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary group"
                onClick={() => {
                  onSelectTemplate(template.code, template.type, template.name);
                  onClose();
                }}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted/30">
                  <TemplatePreview code={template.code} id={template.id} />
                </div>
                <div className="p-3 border-t">
                  <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {template.name}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground capitalize">
                      {template.type}
                    </span>
                    {template.category && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {template.category}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default TemplatesGallery;