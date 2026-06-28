"use client";

import {
  Camera,
  LayoutDashboard,
  Rocket,
  ShoppingBag,
  Smartphone,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Template {
  icon: LucideIcon;
  label: string;
  prompt: string;
}

const templates: Template[] = [
  {
    icon: LayoutDashboard,
    label: "Analytics dashboard",
    prompt:
      "A SaaS analytics dashboard with a dark sidebar, line charts for weekly revenue, and a table of recent transactions.",
  },
  {
    icon: Rocket,
    label: "Startup landing page",
    prompt:
      "A landing page for an AI fitness coach app, with a hero section, three pricing tiers, and a testimonials carousel.",
  },
  {
    icon: ShoppingBag,
    label: "Online storefront",
    prompt:
      "A storefront for handmade ceramics with a product grid, a cart drawer, and a checkout flow.",
  },
  {
    icon: Camera,
    label: "Photography portfolio",
    prompt:
      "A minimal photography portfolio with a fullscreen image gallery and a contact page.",
  },
  {
    icon: Wrench,
    label: "Internal admin tool",
    prompt:
      "An internal admin panel to manage support tickets, with filters by status and assignee.",
  },
  {
    icon: Smartphone,
    label: "Habit tracker",
    prompt:
      "A mobile-first habit tracking app with daily streaks, reminders, and a weekly progress chart.",
  },
];

interface PromptTemplatesProps {
  onSelect: (prompt: string) => void;
}

export function PromptTemplates({ onSelect }: PromptTemplatesProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {templates.map((template) => {
        const Icon = template.icon;
        return (
          <button
            key={template.label}
            type="button"
            onClick={() => onSelect(template.prompt)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-teal-500/40 hover:text-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
            {template.label}
          </button>
        );
      })}
    </div>
  );
}
