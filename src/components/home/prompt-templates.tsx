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
  blurb: string;
  prompt: string;
}

const templates: Template[] = [
  {
    icon: LayoutDashboard,
    label: "Analytics dashboard",
    blurb: "Charts, KPIs, live tables",
    prompt:
      "A SaaS analytics dashboard with a collapsible dark sidebar, KPI cards with sparklines, an interactive revenue line chart with range filters, and a sortable table of recent transactions.",
  },
  {
    icon: Rocket,
    label: "Startup landing page",
    blurb: "Hero, pricing, testimonials",
    prompt:
      "A high-converting landing page for an AI fitness coach app with an animated hero, feature grid, three pricing tiers with a monthly/yearly toggle, a testimonials carousel and an FAQ accordion.",
  },
  {
    icon: ShoppingBag,
    label: "Online storefront",
    blurb: "Products, cart, checkout",
    prompt:
      "A storefront for handmade ceramics with a filterable product grid, quick-view modal, a working cart drawer with quantity controls, and a checkout flow.",
  },
  {
    icon: Camera,
    label: "Photography portfolio",
    blurb: "Gallery with lightbox",
    prompt:
      "A minimal, editorial photography portfolio with a masonry gallery, category filters, a fullscreen lightbox, an about section and a contact form.",
  },
  {
    icon: Wrench,
    label: "Support ticket tool",
    blurb: "Filters, statuses, assignees",
    prompt:
      "An internal admin panel to manage support tickets with status and assignee filters, search, a ticket detail drawer, and the ability to change status and add comments.",
  },
  {
    icon: Smartphone,
    label: "Habit tracker",
    blurb: "Streaks and weekly charts",
    prompt:
      "A mobile-first habit tracking app with daily streaks, a check-in calendar heatmap, reminders, and a weekly progress chart. Persist to localStorage.",
  },
];

interface PromptTemplatesProps {
  onSelect: (prompt: string) => void;
}

export function PromptTemplates({ onSelect }: PromptTemplatesProps) {
  return (
    <section id="templates" className="scroll-mt-20">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        Start from an example
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.label}
              type="button"
              onClick={() => onSelect(template.prompt)}
              className="group flex items-center gap-3.5 rounded-xl border border-border bg-card p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-black/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-brand transition-colors group-hover:border-brand/30 group-hover:bg-brand/10">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-sm font-semibold">
                  {template.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {template.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
