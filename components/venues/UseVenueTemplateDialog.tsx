"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVenueTemplates } from "@/lib/hooks/use-venues";
import { FileText, Loader2 } from "lucide-react";

interface UseVenueTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: string) => void;
  isLoadingTemplate?: boolean;
}

export function UseVenueTemplateDialog({
  open,
  onOpenChange,
  onSelectTemplate,
  isLoadingTemplate = false,
}: UseVenueTemplateDialogProps) {
  const { data: templates = [], isLoading } = useVenueTemplates();

  const handleSelect = (templateId: string) => {
    onSelectTemplate(templateId);
    // Don't close immediately - let the parent handle closing after template loads
    // The dialog will close when template is successfully loaded
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Use Venue Template</DialogTitle>
          <DialogDescription>
            Choose one of your saved venue templates to quickly pre-fill the form. You can still edit all fields after
            loading a template.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading templates...
            </div>
          ) : isLoadingTemplate ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Applying template to form...
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <FileText className="mb-2 h-6 w-6" />
              <p>No templates available yet.</p>
              <p className="mt-1 text-xs">
                Create a venue and use &quot;Save as Template&quot; to store it for future use.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-64 pr-2">
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelect(template.id)}
                    disabled={isLoadingTemplate}
                    className="flex w-full items-center justify-between rounded-md border bg-card px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Created {new Date(template.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
