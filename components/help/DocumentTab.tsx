import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, ArrowDown } from "lucide-react";

export function DocumentTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Documentation</CardTitle>
          <CardDescription>Simple guide to understanding and using the Event Planner system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Roles Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">User Roles</h2>
            <p className="text-muted-foreground mb-4">
              There are 6 different roles in the system. Each role has different permissions and can see different data.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Role</th>
                    <th className="text-left p-3 font-semibold">What They Do</th>
                    <th className="text-left p-3 font-semibold">What They Can See</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="p-3 font-medium">Event Planner</td>
                    <td className="p-3 text-muted-foreground">
                      Creates events, requests changes, and submits reports after events
                    </td>
                    <td className="p-3 text-muted-foreground">Only their own data</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">City Curator</td>
                    <td className="p-3 text-muted-foreground">
                      Approves events for their city. Can get extra permissions from Global Director
                    </td>
                    <td className="p-3 text-muted-foreground">Their data + Event Planners under them</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Regional Curator</td>
                    <td className="p-3 text-muted-foreground">
                      Approves events for their region. Manages multiple cities
                    </td>
                    <td className="p-3 text-muted-foreground">Their data + all users under them</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Lead Curator</td>
                    <td className="p-3 text-muted-foreground">
                      Top curator level. Approves events and manages multiple regions
                    </td>
                    <td className="p-3 text-muted-foreground">Their data + all users under them</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Marketing Manager</td>
                    <td className="p-3 text-muted-foreground">
                      Adds marketing report after each event is approved. Report must be approved by Global Director
                    </td>
                    <td className="p-3 text-muted-foreground">Their data + events they report on</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Global Director</td>
                    <td className="p-3 text-muted-foreground">
                      Final decision maker. Cannot bypass the approval flow—must approve in sequence like other
                      curators. Manages users, sets up organization structure, can ban venues, and is the only role that
                      can add DJs.
                    </td>
                    <td className="p-3 text-muted-foreground">Everything in the system</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <Separator />

          {/* Pyramid Visibility Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">What Data Can You See?</h2>
            <p className="text-muted-foreground mb-4">
              The system uses a &quot;pyramid&quot; structure to control who can see what data. Think of it like an
              organization chart.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium mb-1">You can see:</p>
                  <p className="text-sm text-muted-foreground">
                    Your own data + data from people below you in the organization
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium mb-1">You cannot see:</p>
                  <p className="text-sm text-muted-foreground">
                    Data from people at the same level as you (your colleagues)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium mb-1">Global Director visibility:</p>
                  <p className="text-sm text-muted-foreground">Global Director can see everything in the system</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium mb-1">No bypassing approval:</p>
                  <p className="text-sm text-muted-foreground">
                    Global Director cannot skip the approval chain; they must approve in their turn like any other
                    approver.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 border rounded-lg bg-background">
              <p className="text-sm font-medium mb-2">Example:</p>
              <p className="text-sm text-muted-foreground">
                If you&apos;re a City Curator, you can see your own events and events from Event Planners who report to
                you. But you cannot see events from other City Curators at your same level.
              </p>
            </div>
          </section>

          <Separator />

          {/* Menu Structure Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Main Menu Items</h2>
            <p className="text-muted-foreground mb-4">Here&apos;s what each menu item does and who can access it:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Menu Item</th>
                    <th className="text-left p-3 font-semibold">Who Can Access</th>
                    <th className="text-left p-3 font-semibold">What It Does</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="p-3 font-medium">Event Requests</td>
                    <td className="p-3 text-muted-foreground">Event Planners (and curators who can create events)</td>
                    <td className="p-3 text-muted-foreground">
                      Create new events, view drafts, see requests in review, and handle rejected requests
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Calendar</td>
                    <td className="p-3 text-muted-foreground">Everyone</td>
                    <td className="p-3 text-muted-foreground">
                      View all events and DJs according to pyramid level. Filter by city, region, date, etc. Shows
                      current approved events, past events, and cancelled/rejected events.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Pending Approvals</td>
                    <td className="p-3 text-muted-foreground">Curators and Global Director</td>
                    <td className="p-3 text-muted-foreground">
                      Approve or reject events, modifications, cancellations, venue requests, and reports. At each step
                      you must verify an OTP sent to your email before the action is completed. Always requires a
                      reason.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Venues</td>
                    <td className="p-3 text-muted-foreground">Everyone (create requires approval)</td>
                    <td className="p-3 text-muted-foreground">
                      Manage venue database. Creating a new venue goes through the same approval chain as creating an
                      event. You see venues you created (or venues from users below you if you&apos;re a curator).
                      Global Director sees all venues and can ban them.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">DJs</td>
                    <td className="p-3 text-muted-foreground">Global Director only (to add)</td>
                    <td className="p-3 text-muted-foreground">
                      Only the Global Director can add DJs. Other roles can view DJs according to pyramid visibility.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">User Management</td>
                    <td className="p-3 text-muted-foreground">Global Director only</td>
                    <td className="p-3 text-muted-foreground">
                      Create, edit, and deactivate users. Set roles, permissions, and organization structure.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Reports</td>
                    <td className="p-3 text-muted-foreground">Everyone</td>
                    <td className="p-3 text-muted-foreground">View reports and analytics about events</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Activity Logs</td>
                    <td className="p-3 text-muted-foreground">Curators and Global Director</td>
                    <td className="p-3 text-muted-foreground">View system-wide activity and audit trail</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Profile</td>
                    <td className="p-3 text-muted-foreground">Everyone</td>
                    <td className="p-3 text-muted-foreground">
                      Update your profile picture and notification settings. Cannot change role or organization (set by
                      Global Director).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <Separator />

          {/* Event Creation Approval Flow */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">How Events Get Created and Approved</h2>
            <p className="text-muted-foreground mb-6">
              When you create an event, it goes through an approval process. Here&apos;s how it works:
            </p>

            <div className="space-y-4">
              {/* Workflow Steps */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">Event Planner creates event</p>
                    <p className="text-sm text-muted-foreground">Fill out event details and submit for approval</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">System finds approvers</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically builds approval chain going up the organization
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">Each approver reviews (including Global Director)</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Global Director cannot bypass—each approver acts in turn. To approve or reject, the approver
                      receives an OTP by email and must enter it to confirm the action.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium">Approve</span>
                        </div>
                        <p className="text-xs text-muted-foreground">OTP required → moves to next level</p>
                      </div>
                      <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900">
                        <div className="flex items-center gap-2 mb-1">
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-medium">Reject</span>
                        </div>
                        <p className="text-xs text-muted-foreground">OTP + reason required. Event stops here.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold text-sm">
                    ✓
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <p className="font-medium mb-1">Global Director approves (with OTP)</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Event becomes &quot;Approved – Scheduled&quot; and appears in Current events.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      A calendar event email is sent to the event planner, assigned DJs, other subordinates, and the
                      marketing manager.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Venue Creation Approval Flow */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Creating a Venue</h2>
            <p className="text-muted-foreground mb-4">
              Creating a new venue uses the same approval chain as creating an event. The request goes up the
              organization (City → Regional → Lead → Global Director). At each step, the approver must verify with OTP
              to approve or reject, and only after Global Director approval is the venue added to the database.
            </p>
          </section>

          <Separator />

          {/* Modification Flow */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Changing an Approved Event</h2>
            <p className="text-muted-foreground mb-6">
              You can only request changes after an event has been approved by Global Director:
            </p>

            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">Event Planner requests change</p>
                    <p className="text-sm text-muted-foreground">Only Event Planner can request modifications</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">Two versions exist</p>
                    <p className="text-sm text-muted-foreground">
                      Original event stays active with &quot;Modification pending&quot; badge. New version created with
                      changes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">Goes through approval chain</p>
                    <p className="text-sm text-muted-foreground">
                      Same process as creating a new event. Each approver must verify with OTP to approve or reject.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium">If Approved</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Changes become the new approved version. Original is replaced.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium">If Rejected</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Original event stays unchanged. Reason required.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Cancellation Flow */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Cancelling an Event</h2>
            <p className="text-muted-foreground mb-6">
              You can only cancel events that have been approved. Not everyone can cancel - Global Director sets who has
              permission:
            </p>

            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">User requests cancellation</p>
                    <p className="text-sm text-muted-foreground">
                      Must have cancellation permission (set by Global Director)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">Provide reason</p>
                    <p className="text-sm text-muted-foreground">Must explain why the event needs to be cancelled</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">Goes through approval chain</p>
                    <p className="text-sm text-muted-foreground">
                      Up to Global Director for final decision. Each approver must verify with OTP to approve or reject.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium">If Approved</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Event status changes to Cancelled. Moved to Cancelled/Rejected tab.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium">If Rejected</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Event stays active and continues as planned.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Reporting Flow */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Submitting Event Reports</h2>
            <p className="text-muted-foreground mb-4">
              After an event happens, the Event Planner submits an event report. After each event is approved (by Global
              Director), the Marketing Manager must add a marketing report, which the Global Director must approve.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">Event report (Event Planner)</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">Event date passes</p>
                    <p className="text-sm text-muted-foreground">
                      System automatically moves event to &quot;Completed – Awaiting report&quot;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-2">Event Planner fills out report</p>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>• Enter numbers (attendance, etc.)</p>
                      <p>• Add media links or upload photos/videos</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1 p-4 border rounded-lg bg-background">
                    <p className="font-medium mb-1">Report goes through approval (with OTP at each step)</p>
                    <p className="text-sm text-muted-foreground">
                      Same approval chain as events—up to Global Director. Each approver verifies with OTP.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium">If Approved</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Event becomes &quot;Completed – Archived&quot; and moves to Past events.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium">If Rejected</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Planner revises and resubmits. Reason required.</p>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold mt-8 mb-3">Marketing report (Marketing Manager)</h3>
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm text-muted-foreground">
                After an event is approved by Global Director, the Marketing Manager must add a marketing report for
                that event. The marketing report then goes to the Global Director for approval. OTP verification is
                required when the Global Director approves or rejects the marketing report.
              </p>
            </div>
          </section>

          <Separator />

          {/* Logging Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Activity Logging</h2>
            <p className="text-muted-foreground mb-4">
              Everything you do in the system is recorded. This helps track what happened and who did it.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div>
                <p className="font-medium mb-2">What gets logged:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Submit event request</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Approve or reject (OTP verification + reasons)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Create venue (approval chain like events)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Add DJ (Global Director only)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Request modification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Request cancellation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Submit report</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Approve or reject report</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Submit and approve marketing report</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="font-medium mb-2">Each log entry includes:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-background rounded text-xs">Timestamp</span>
                  <span className="px-2 py-1 bg-background rounded text-xs">User name</span>
                  <span className="px-2 py-1 bg-background rounded text-xs">Action taken</span>
                  <span className="px-2 py-1 bg-background rounded text-xs">Comments/Reason</span>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Where to see logs:</strong> View activity history on each event&apos;s detail page. Curators
                  and Global Director can also see system-wide logs in the Activity Logs menu.
                </p>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
