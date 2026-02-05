import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Grid3X3 } from "lucide-react";

const TEMPLATES = [
  {
    id: "microservices",
    name: "Microservices Architecture",
    type: "architecture",
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

const TemplatesGallery = ({ onSelectTemplate, onClose }: TemplatesGalleryProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Diagram Templates</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary"
                onClick={() => {
                  onSelectTemplate(template.code, template.type, template.name);
                  onClose();
                }}
              >
                <h3 className="font-semibold mb-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{template.type}</p>
                <div className="mt-3 p-2 bg-muted rounded text-xs font-mono overflow-hidden">
                  <pre className="line-clamp-3">{template.code}</pre>
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