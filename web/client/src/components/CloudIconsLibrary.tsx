import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Check, Search, Cloud } from "lucide-react";
import { toast } from "sonner";

interface CloudIconsLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertIcon: (iconCode: string) => void;
}

interface CloudIcon {
  id: string;
  name: string;
  code: string;
  category: string;
}

const AWS_ICONS: CloudIcon[] = [
  // Compute
  { id: "aws-ec2", name: "EC2", code: "AWS_EC2[\"fa:fa-server EC2\"]", category: "Compute" },
  { id: "aws-lambda", name: "Lambda", code: "AWS_Lambda[\"fa:fa-bolt Lambda\"]", category: "Compute" },
  { id: "aws-ecs", name: "ECS", code: "AWS_ECS[\"fa:fa-cubes ECS\"]", category: "Compute" },
  { id: "aws-eks", name: "EKS", code: "AWS_EKS[\"fa:fa-dharmachakra EKS\"]", category: "Compute" },
  { id: "aws-fargate", name: "Fargate", code: "AWS_Fargate[\"fa:fa-cube Fargate\"]", category: "Compute" },
  { id: "aws-batch", name: "Batch", code: "AWS_Batch[\"fa:fa-layer-group Batch\"]", category: "Compute" },
  
  // Storage
  { id: "aws-s3", name: "S3", code: "AWS_S3[(\"fa:fa-bucket S3\")]", category: "Storage" },
  { id: "aws-ebs", name: "EBS", code: "AWS_EBS[(\"fa:fa-hdd EBS\")]", category: "Storage" },
  { id: "aws-efs", name: "EFS", code: "AWS_EFS[(\"fa:fa-folder-open EFS\")]", category: "Storage" },
  { id: "aws-glacier", name: "Glacier", code: "AWS_Glacier[(\"fa:fa-snowflake Glacier\")]", category: "Storage" },
  
  // Database
  { id: "aws-rds", name: "RDS", code: "AWS_RDS[(\"fa:fa-database RDS\")]", category: "Database" },
  { id: "aws-dynamodb", name: "DynamoDB", code: "AWS_DynamoDB[(\"fa:fa-table DynamoDB\")]", category: "Database" },
  { id: "aws-aurora", name: "Aurora", code: "AWS_Aurora[(\"fa:fa-database Aurora\")]", category: "Database" },
  { id: "aws-elasticache", name: "ElastiCache", code: "AWS_ElastiCache[(\"fa:fa-memory ElastiCache\")]", category: "Database" },
  { id: "aws-redshift", name: "Redshift", code: "AWS_Redshift[(\"fa:fa-chart-bar Redshift\")]", category: "Database" },
  
  // Networking
  { id: "aws-vpc", name: "VPC", code: "AWS_VPC{{\"fa:fa-network-wired VPC\"}}", category: "Networking" },
  { id: "aws-cloudfront", name: "CloudFront", code: "AWS_CloudFront[\"fa:fa-globe CloudFront\"]", category: "Networking" },
  { id: "aws-route53", name: "Route 53", code: "AWS_Route53[\"fa:fa-directions Route 53\"]", category: "Networking" },
  { id: "aws-elb", name: "Load Balancer", code: "AWS_ELB[\"fa:fa-balance-scale ALB/NLB\"]", category: "Networking" },
  { id: "aws-apigateway", name: "API Gateway", code: "AWS_APIGateway[\"fa:fa-door-open API Gateway\"]", category: "Networking" },
  
  // Integration
  { id: "aws-sqs", name: "SQS", code: "AWS_SQS>\"fa:fa-envelope SQS\"]", category: "Integration" },
  { id: "aws-sns", name: "SNS", code: "AWS_SNS[\"fa:fa-bell SNS\"]", category: "Integration" },
  { id: "aws-eventbridge", name: "EventBridge", code: "AWS_EventBridge[\"fa:fa-calendar EventBridge\"]", category: "Integration" },
  { id: "aws-stepfunctions", name: "Step Functions", code: "AWS_StepFunctions[\"fa:fa-sitemap Step Functions\"]", category: "Integration" },
  
  // Security
  { id: "aws-iam", name: "IAM", code: "AWS_IAM[\"fa:fa-user-shield IAM\"]", category: "Security" },
  { id: "aws-cognito", name: "Cognito", code: "AWS_Cognito[\"fa:fa-users Cognito\"]", category: "Security" },
  { id: "aws-kms", name: "KMS", code: "AWS_KMS[\"fa:fa-key KMS\"]", category: "Security" },
  { id: "aws-waf", name: "WAF", code: "AWS_WAF[\"fa:fa-shield-alt WAF\"]", category: "Security" },
];

const GCP_ICONS: CloudIcon[] = [
  // Compute
  { id: "gcp-compute", name: "Compute Engine", code: "GCP_Compute[\"fa:fa-server Compute Engine\"]", category: "Compute" },
  { id: "gcp-functions", name: "Cloud Functions", code: "GCP_Functions[\"fa:fa-bolt Cloud Functions\"]", category: "Compute" },
  { id: "gcp-gke", name: "GKE", code: "GCP_GKE[\"fa:fa-dharmachakra GKE\"]", category: "Compute" },
  { id: "gcp-run", name: "Cloud Run", code: "GCP_Run[\"fa:fa-running Cloud Run\"]", category: "Compute" },
  { id: "gcp-appengine", name: "App Engine", code: "GCP_AppEngine[\"fa:fa-rocket App Engine\"]", category: "Compute" },
  
  // Storage
  { id: "gcp-storage", name: "Cloud Storage", code: "GCP_Storage[(\"fa:fa-bucket Cloud Storage\")]", category: "Storage" },
  { id: "gcp-filestore", name: "Filestore", code: "GCP_Filestore[(\"fa:fa-folder Filestore\")]", category: "Storage" },
  
  // Database
  { id: "gcp-cloudsql", name: "Cloud SQL", code: "GCP_CloudSQL[(\"fa:fa-database Cloud SQL\")]", category: "Database" },
  { id: "gcp-spanner", name: "Spanner", code: "GCP_Spanner[(\"fa:fa-project-diagram Spanner\")]", category: "Database" },
  { id: "gcp-firestore", name: "Firestore", code: "GCP_Firestore[(\"fa:fa-fire Firestore\")]", category: "Database" },
  { id: "gcp-bigtable", name: "Bigtable", code: "GCP_Bigtable[(\"fa:fa-table Bigtable\")]", category: "Database" },
  { id: "gcp-bigquery", name: "BigQuery", code: "GCP_BigQuery[(\"fa:fa-chart-bar BigQuery\")]", category: "Database" },
  
  // Networking
  { id: "gcp-vpc", name: "VPC", code: "GCP_VPC{{\"fa:fa-network-wired VPC\"}}", category: "Networking" },
  { id: "gcp-loadbalancer", name: "Load Balancer", code: "GCP_LB[\"fa:fa-balance-scale Load Balancer\"]", category: "Networking" },
  { id: "gcp-cdn", name: "Cloud CDN", code: "GCP_CDN[\"fa:fa-globe Cloud CDN\"]", category: "Networking" },
  { id: "gcp-dns", name: "Cloud DNS", code: "GCP_DNS[\"fa:fa-directions Cloud DNS\"]", category: "Networking" },
  
  // Integration
  { id: "gcp-pubsub", name: "Pub/Sub", code: "GCP_PubSub[\"fa:fa-envelope Pub/Sub\"]", category: "Integration" },
  { id: "gcp-tasks", name: "Cloud Tasks", code: "GCP_Tasks[\"fa:fa-tasks Cloud Tasks\"]", category: "Integration" },
  { id: "gcp-scheduler", name: "Cloud Scheduler", code: "GCP_Scheduler[\"fa:fa-clock Cloud Scheduler\"]", category: "Integration" },
  
  // Security
  { id: "gcp-iam", name: "IAM", code: "GCP_IAM[\"fa:fa-user-shield IAM\"]", category: "Security" },
  { id: "gcp-kms", name: "Cloud KMS", code: "GCP_KMS[\"fa:fa-key Cloud KMS\"]", category: "Security" },
];

const AZURE_ICONS: CloudIcon[] = [
  // Compute
  { id: "azure-vm", name: "Virtual Machines", code: "Azure_VM[\"fa:fa-server Virtual Machines\"]", category: "Compute" },
  { id: "azure-functions", name: "Functions", code: "Azure_Functions[\"fa:fa-bolt Azure Functions\"]", category: "Compute" },
  { id: "azure-aks", name: "AKS", code: "Azure_AKS[\"fa:fa-dharmachakra AKS\"]", category: "Compute" },
  { id: "azure-container", name: "Container Instances", code: "Azure_Container[\"fa:fa-cube Container Instances\"]", category: "Compute" },
  { id: "azure-appservice", name: "App Service", code: "Azure_AppService[\"fa:fa-rocket App Service\"]", category: "Compute" },
  
  // Storage
  { id: "azure-blob", name: "Blob Storage", code: "Azure_Blob[(\"fa:fa-bucket Blob Storage\")]", category: "Storage" },
  { id: "azure-files", name: "Azure Files", code: "Azure_Files[(\"fa:fa-folder Azure Files\")]", category: "Storage" },
  { id: "azure-disk", name: "Managed Disks", code: "Azure_Disk[(\"fa:fa-hdd Managed Disks\")]", category: "Storage" },
  
  // Database
  { id: "azure-sql", name: "Azure SQL", code: "Azure_SQL[(\"fa:fa-database Azure SQL\")]", category: "Database" },
  { id: "azure-cosmos", name: "Cosmos DB", code: "Azure_Cosmos[(\"fa:fa-globe Cosmos DB\")]", category: "Database" },
  { id: "azure-redis", name: "Azure Cache", code: "Azure_Redis[(\"fa:fa-memory Azure Cache\")]", category: "Database" },
  { id: "azure-synapse", name: "Synapse", code: "Azure_Synapse[(\"fa:fa-chart-bar Synapse\")]", category: "Database" },
  
  // Networking
  { id: "azure-vnet", name: "Virtual Network", code: "Azure_VNet{{\"fa:fa-network-wired Virtual Network\"}}", category: "Networking" },
  { id: "azure-loadbalancer", name: "Load Balancer", code: "Azure_LB[\"fa:fa-balance-scale Load Balancer\"]", category: "Networking" },
  { id: "azure-cdn", name: "Azure CDN", code: "Azure_CDN[\"fa:fa-globe Azure CDN\"]", category: "Networking" },
  { id: "azure-frontdoor", name: "Front Door", code: "Azure_FrontDoor[\"fa:fa-door-open Front Door\"]", category: "Networking" },
  { id: "azure-dns", name: "Azure DNS", code: "Azure_DNS[\"fa:fa-directions Azure DNS\"]", category: "Networking" },
  { id: "azure-apimanagement", name: "API Management", code: "Azure_APIM[\"fa:fa-cogs API Management\"]", category: "Networking" },
  
  // Integration
  { id: "azure-servicebus", name: "Service Bus", code: "Azure_ServiceBus[\"fa:fa-bus Service Bus\"]", category: "Integration" },
  { id: "azure-eventgrid", name: "Event Grid", code: "Azure_EventGrid[\"fa:fa-th Event Grid\"]", category: "Integration" },
  { id: "azure-eventhubs", name: "Event Hubs", code: "Azure_EventHubs[\"fa:fa-stream Event Hubs\"]", category: "Integration" },
  { id: "azure-logicapps", name: "Logic Apps", code: "Azure_LogicApps[\"fa:fa-sitemap Logic Apps\"]", category: "Integration" },
  
  // Security
  { id: "azure-ad", name: "Azure AD", code: "Azure_AD[\"fa:fa-users Azure AD\"]", category: "Security" },
  { id: "azure-keyvault", name: "Key Vault", code: "Azure_KeyVault[\"fa:fa-key Key Vault\"]", category: "Security" },
  { id: "azure-sentinel", name: "Sentinel", code: "Azure_Sentinel[\"fa:fa-shield-alt Sentinel\"]", category: "Security" },
];

export const CloudIconsLibrary = ({
  open,
  onOpenChange,
  onInsertIcon,
}: CloudIconsLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filterIcons = (icons: CloudIcon[]) => {
    if (!searchQuery) return icons;
    const query = searchQuery.toLowerCase();
    return icons.filter(
      (icon) =>
        icon.name.toLowerCase().includes(query) ||
        icon.category.toLowerCase().includes(query)
    );
  };

  const handleCopyIcon = (icon: CloudIcon) => {
    navigator.clipboard.writeText(icon.code);
    setCopiedId(icon.id);
    toast.success(`${icon.name} code copied!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertIcon = (icon: CloudIcon) => {
    onInsertIcon(icon.code);
    toast.success(`${icon.name} inserted into diagram`);
  };

  const renderIconGrid = (icons: CloudIcon[]) => {
    const filteredIcons = filterIcons(icons);
    const categories = [...new Set(filteredIcons.map((i) => i.category))];

    if (filteredIcons.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No icons found matching "{searchQuery}"
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              {category}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredIcons
                .filter((i) => i.category === category)
                .map((icon) => (
                  <div
                    key={icon.id}
                    className="group relative p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleInsertIcon(icon)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {icon.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyIcon(icon);
                        }}
                      >
                        {copiedId === icon.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Cloud Icons Library
          </DialogTitle>
          <DialogDescription>
            Click an icon to insert it into your diagram, or copy the code
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search icons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="aws" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="aws">AWS</TabsTrigger>
            <TabsTrigger value="gcp">GCP</TabsTrigger>
            <TabsTrigger value="azure">Azure</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="aws" className="mt-0">
              {renderIconGrid(AWS_ICONS)}
            </TabsContent>
            <TabsContent value="gcp" className="mt-0">
              {renderIconGrid(GCP_ICONS)}
            </TabsContent>
            <TabsContent value="azure" className="mt-0">
              {renderIconGrid(AZURE_ICONS)}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
