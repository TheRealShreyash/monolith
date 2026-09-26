"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProjects } from "@/features/projects/hooks/projects";

function ProjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split("-")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function formatProjectName(name: string) {
  return name.replace(/-/g, " ");
}

export function ProjectGrid() {
  const { data: projects, isLoading, isError } = useGetProjects();

  if (isError) return null;
  if (!isLoading && (!projects || projects.length === 0)) return null;

  return (
    <section id="projects" className="scroll-mt-20">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        Your projects
      </h2>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <ProjectCardSkeleton key={index} />
            ))
          : projects?.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-black/10"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-muted/60 [background-image:radial-gradient(color-mix(in_oklab,var(--foreground)_14%,transparent)_1px,transparent_1px)] [background-size:14px_14px]">
                  <span className="flex h-full w-full items-center justify-center font-mono text-2xl font-medium uppercase text-muted-foreground transition-colors group-hover:text-brand">
                    {initials(project.name)}
                  </span>
                </div>
                <div className="border-t border-border px-3.5 py-3">
                  <p className="truncate text-sm font-medium capitalize">
                    {formatProjectName(project.name)}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(project.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}
