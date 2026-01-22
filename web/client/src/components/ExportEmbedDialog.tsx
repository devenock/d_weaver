import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ExportEmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
}

export function ExportEmbedDialog({ open, onOpenChange, imageUrl, title }: ExportEmbedDialogProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const markdownCode = `![${title}](${imageUrl})`;
  const htmlCode = `<img src="${imageUrl}" alt="${title}" />`;
  const mdxCode = `import Image from 'next/image'\n\n<Image src="${imageUrl}" alt="${title}" width={800} height={600} />`;

  const handleCopy = (code: string, tab: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(tab);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export to README</DialogTitle>
          <DialogDescription>
            Copy the embed code below to add this diagram to your GitHub README, documentation, or website.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="markdown" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="mdx">MDX/Next.js</TabsTrigger>
          </TabsList>

          <TabsContent value="markdown" className="space-y-3">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>{markdownCode}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(markdownCode, "markdown")}
              >
                {copiedTab === "markdown" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this in your README.md, documentation, or any markdown file.
            </p>
          </TabsContent>

          <TabsContent value="html" className="space-y-3">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>{htmlCode}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(htmlCode, "html")}
              >
                {copiedTab === "html" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this in HTML files or static websites.
            </p>
          </TabsContent>

          <TabsContent value="mdx" className="space-y-3">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>{mdxCode}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(mdxCode, "mdx")}
              >
                {copiedTab === "mdx" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this in MDX files or Next.js documentation sites.
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
