/**
 * Login Page
 * Email/password authentication
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPassword } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signInWithPassword(email, password);

      if (result.success) {
        toast.success("Signed in successfully");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to sign in");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-2">
            <Image
              src="/images/shiraz-house-logo.webp"
              alt="Shiraz House"
              width={120}
              height={48}
              priority
              className="h-12 w-auto object-contain"
            />
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="email"
              />
            </div>
            <PasswordInput
              id="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Contact your administrator for an invitation link if you don&apos;t have an account.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
