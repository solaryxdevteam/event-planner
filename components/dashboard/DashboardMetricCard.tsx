"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface DashboardMetricCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  href?: string;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  borderColor?: string;
  className?: string;
}

export function DashboardMetricCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  badge,
  borderColor = "border-l-blue-500",
  className,
}: DashboardMetricCardProps) {
  const content = (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md",
        borderColor && `border-l-4 ${borderColor}`,
        href && "cursor-pointer",
        className
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          </div>
          {badge && (
            <Badge
              variant={badge.variant || "secondary"}
              className={cn(
                "shrink-0",
                badge.label === "Action Required" &&
                  "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100"
              )}
            >
              {badge.label}
            </Badge>
          )}
        </div>
        <p className="text-3xl font-bold tracking-tight mb-1">{value}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
