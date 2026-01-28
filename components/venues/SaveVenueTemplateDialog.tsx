"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSaveVenueAsTemplate, useVenueTemplates } from "@/lib/hooks/use-venues";
import type { CreateVenueInput } from "@/lib/validation/venues.schema";

interface SaveVenueTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueData: CreateVenueInput;
  onSuccess?: () => void;
}

export function SaveVenueTemplateDialog({ open, onOpenChange, venueData, onSuccess }: SaveVenueTemplateDialogProps) {
  const [templateName, setTemplateName] = useState("");
  const { data: templates = [], isLoading: templatesLoading } = useVenueTemplates();
  const saveTemplateMutation = useSaveVenueAsTemplate();

  const MAX_TEMPLATES_PER_USER = 5;
  const hasReachedLimit = templates.length >= MAX_TEMPLATES_PER_USER;

  const handleSave = async () => {
    if (!templateName.trim() || hasReachedLimit) {
      return;
    }

    try {
      await saveTemplateMutation.mutateAsync({
        name: templateName.trim(),
        templateData: venueData,
      });
      setTemplateName("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the mutation hook (toast shown)
    }
  };

  const handleCancel = () => {
    setTemplateName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this venue configuration as a template for quick reuse. Templates are private to you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!templatesLoading && hasReachedLimit ? (
            <p className="text-sm text-muted-foreground">
              You have reached the maximum of {MAX_TEMPLATES_PER_USER} venue templates. Please delete an existing
              template before saving a new one.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Conference Center Template"
                maxLength={200}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && templateName.trim() && !hasReachedLimit) {
                    handleSave();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Choose a descriptive name to easily identify this template later. You can save up to{" "}
                {MAX_TEMPLATES_PER_USER} templates.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saveTemplateMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!templateName.trim() || saveTemplateMutation.isPending || hasReachedLimit}
          >
            {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
