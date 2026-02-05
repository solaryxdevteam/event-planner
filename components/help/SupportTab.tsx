import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageCircle, Clock } from "lucide-react";

export function SupportTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Get Support</CardTitle>
          <CardDescription>We&apos;re here to help you with any questions or issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Email Support</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Send us an email and we&apos;ll get back to you as soon as possible.
              </p>
              <a href="mailto:support@shirazhouse.com" className="text-sm text-primary hover:underline">
                support@shirazhouse.com
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Response Time</h3>
              <p className="text-sm text-muted-foreground">
                We typically respond within 24-48 hours during business days.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Business Hours</h3>
              <p className="text-sm text-muted-foreground">Monday - Friday: 9:00 AM - 5:00 PM (Local Time)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Before Contacting Support</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Check the FAQ section for common questions</li>
            <li>Review the Documentation tab for detailed system information</li>
            <li>Include relevant details such as event IDs, user names, or error messages</li>
            <li>Describe the steps you&apos;ve already taken to resolve the issue</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
