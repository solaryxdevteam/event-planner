"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Mail, RefreshCw } from "lucide-react";

interface TemplateMeta {
  id: string;
  label: string;
  description: string;
}

export function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"ok" | "err" | null>(null);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    fetch("/api/dev/email-templates/list")
      .then((res) => {
        if (!res.ok) throw new Error("Not available");
        return res.json();
      })
      .then((data: { templates: TemplateMeta[] }) => {
        setTemplates(data.templates);
        if (data.templates.length > 0 && selectedId === null) {
          setSelectedId(data.templates[0].id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const selected = templates.find((t) => t.id === selectedId);

  const handleSendTest = async () => {
    if (!selectedId || !testEmail.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/dev/email-templates/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedId, to: testEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Send failed");
      setSendResult("ok");
    } catch {
      setSendResult("err");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <p className="font-medium">Email templates not available</p>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-sm mt-2 text-muted-foreground">
          This page is only available in development or when ENABLE_EMAIL_PREVIEW is set.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email templates</h1>
        <p className="text-muted-foreground mt-1">Click a template to preview and send a test email.</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* List of template names */}
        <nav
          className="shrink-0 w-full lg:w-64 border rounded-lg bg-muted/30 overflow-hidden"
          aria-label="Email template list"
        >
          <ul className="p-1">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(t.id);
                    setSendResult(null);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors",
                    selectedId === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                  )}
                >
                  <Mail className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="truncate">{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Selected template: preview + send test */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <Card className="gap-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {selected.label}
                </CardTitle>
                <CardDescription>{selected.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                  <iframe
                    title={`Preview: ${selected.label}`}
                    src={`/api/dev/email-templates/preview?template=${encodeURIComponent(selected.id)}`}
                    className="w-full min-h-[450px] border-0 bg-white dark:bg-zinc-900"
                    sandbox="allow-same-origin"
                  />
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <Label htmlFor="test-email">Send test to</Label>
                    <Input
                      id="test-email"
                      type="email"
                      placeholder="developer@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSendTest} disabled={sending} variant="outline" size="default">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2">{sending ? "Sending…" : "Send test"}</span>
                  </Button>
                </div>
                {sendResult === "ok" && <span className="text-sm text-green-600 dark:text-green-400">Sent</span>}
                {sendResult === "err" && <span className="text-sm text-destructive">Failed</span>}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 min-h-[320px] text-muted-foreground">
              <Mail className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">Select a template</p>
              <p className="text-sm mt-1">Choose an item from the list to preview and send a test email.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
