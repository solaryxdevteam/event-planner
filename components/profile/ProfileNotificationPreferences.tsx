"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import * as profileClientService from "@/lib/services/client/profile.client.service";
import type { User } from "@/lib/types/database.types";
import { ApiError } from "@/lib/services/client/api-client";
import { UserRole } from "@/lib/types/roles";

interface ProfileNotificationPreferencesProps {
  user: User;
}

const defaultPrefs = {
  email_enabled: true,
  event_approved: true,
  event_rejected: true,
  report_due: true,
  reports_pending_approval: true,
};

export function ProfileNotificationPreferences({ user }: ProfileNotificationPreferencesProps) {
  const queryClient = useQueryClient();
  const prefs = user.notification_prefs ?? defaultPrefs;

  const [emailEnabled, setEmailEnabled] = useState(prefs.email_enabled ?? true);
  const [eventApproved, setEventApproved] = useState(prefs.event_approved ?? true);
  const [eventRejected, setEventRejected] = useState(prefs.event_rejected ?? true);
  const [reportDue, setReportDue] = useState(prefs.report_due ?? true);
  const [reportsPendingApproval, setReportsPendingApproval] = useState(prefs.reports_pending_approval ?? true);

  const isGlobalDirector = user.role === UserRole.GLOBAL_DIRECTOR;

  const updateMutation = useMutation({
    mutationFn: profileClientService.updateNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Notification preferences updated");
    },
    onError: (error: Error) => {
      toast.error(error instanceof ApiError ? error.message : "Failed to update notification preferences");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      email_enabled: emailEnabled,
      event_approved: eventApproved,
      event_rejected: eventRejected,
      report_due: reportDue,
      reports_pending_approval: isGlobalDirector ? reportsPendingApproval : undefined,
    });
  };

  const isPending = user.status === "pending";
  const hasChanges =
    emailEnabled !== (prefs.email_enabled ?? true) ||
    eventApproved !== (prefs.event_approved ?? true) ||
    eventRejected !== (prefs.event_rejected ?? true) ||
    reportDue !== (prefs.report_due ?? true) ||
    (isGlobalDirector && reportsPendingApproval !== (prefs.reports_pending_approval ?? true));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notification Preferences</CardTitle>
        <CardDescription>
          Choose which actions trigger an email. Turn off any you don’t want to receive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="email-enabled"
            checked={emailEnabled}
            onCheckedChange={(checked) => setEmailEnabled(checked === true)}
            disabled={isPending || updateMutation.isPending}
          />
          <Label
            htmlFor="email-enabled"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Enable email notifications
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          When off, no notification emails are sent. When on, you can control each type below.
        </p>

        <div className="space-y-4 border-t pt-4">
          <p className="text-sm font-medium">Notify me by email when:</p>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="event-approved"
              checked={eventApproved}
              onCheckedChange={(checked) => setEventApproved(checked === true)}
              disabled={isPending || updateMutation.isPending || !emailEnabled}
            />
            <Label
              htmlFor="event-approved"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              My event is approved
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="event-rejected"
              checked={eventRejected}
              onCheckedChange={(checked) => setEventRejected(checked === true)}
              disabled={isPending || updateMutation.isPending || !emailEnabled}
            />
            <Label
              htmlFor="event-rejected"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              My event is rejected
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="report-due"
              checked={reportDue}
              onCheckedChange={(checked) => setReportDue(checked === true)}
              disabled={isPending || updateMutation.isPending || !emailEnabled}
            />
            <Label
              htmlFor="report-due"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              A report is due for my event
            </Label>
          </div>

          {isGlobalDirector && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reports-pending-approval"
                checked={reportsPendingApproval}
                onCheckedChange={(checked) => setReportsPendingApproval(checked === true)}
                disabled={isPending || updateMutation.isPending || !emailEnabled}
              />
              <Label
                htmlFor="reports-pending-approval"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Reports need my approval
              </Label>
            </div>
          )}
        </div>

        {!isPending && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={updateMutation.isPending || !hasChanges}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Preferences
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
