"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Code2, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { ChatPanel } from "@/components/project/chat-panel";
import { CodeView } from "@/components/project/code-view";
import { PreviewPane } from "@/components/project/preview-pane";
import { MonolithMark } from "@/components/home/navbar";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Fragment, ProjectMessage } from "@/components/project/types";
import {
  useCreateMessage,
  useGetMessages,
  useGetProjectById,
} from "@/features/projects/hooks/projects";
import { cn } from "@/lib/utils";

interface ProjectViewProps {
  projectId: string;
}

type View = "chat" | "preview" | "code";

const VIEWS: { id: View; label: string; icon: typeof Eye; mobileOnly?: boolean }[] =
  [
    { id: "chat", label: "Chat", icon: MessageSquare, mobileOnly: true },
    { id: "preview", label: "Preview", icon: Eye },
    { id: "code", label: "Code", icon: Code2 },
  ];

export function ProjectView({ projectId }: ProjectViewProps) {
  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
  } = useGetProjectById(projectId);
  const { data: rawMessages, isLoading: isMessagesLoading } =
    useGetMessages(projectId);
  const { mutate: sendMessage, isPending: isSending } =
    useCreateMessage(projectId);

  const messages: ProjectMessage[] = useMemo(
    () =>
      (rawMessages ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        type: message.type,
        content: message.content,
        createdAt: new Date(message.createdAt).toISOString(),
        fragment: message.fragments
          ? {
              id: message.fragments.id,
              title: message.fragments.title,
              sandboxUrl: message.fragments.sandboxUrl,
              files: message.fragments.files as Record<string, string>,
            }
          : undefined,
      })),
    [rawMessages],
  );

  const isWorking =
    isSending || (messages.length > 0 && messages.at(-1)?.role === "USER");

  const latestFragment = messages.findLast((m) => m.fragment)?.fragment ?? null;
  const [activeFragmentId, setActiveFragmentId] = useState<string | null>(null);
  const activeFragment =
    messages.find((m) => m.fragment?.id === activeFragmentId)?.fragment ??
    null;
  const [view, setView] = useState<View>("chat");
  const lastFragmentIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (latestFragment && latestFragment.id !== lastFragmentIdRef.current) {
      lastFragmentIdRef.current = latestFragment.id;
      setActiveFragmentId(latestFragment.id);
      setView("preview");
    }
  }, [latestFragment]);

  const handleSend = (value: string) => {
    sendMessage(value, {
      onError: (error) => toast.error(error.message),
    });
  };

  // Resend the last thing the user asked for (used by the error/stale "Try again").
  const handleRetry = () => {
    const lastPrompt = messages.findLast((m) => m.role === "USER");
    if (lastPrompt) handleSend(lastPrompt.content);
  };

  const workingSince =
    messages.at(-1)?.role === "USER" ? messages.at(-1)?.createdAt : undefined;

  const handleSelectFragment = (fragment: Fragment) => {
    setActiveFragmentId(fragment.id);
    setView((v) => (v === "chat" ? "preview" : v));
  };

  if (isProjectError) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <MonolithMark />
        <h1 className="font-display text-2xl font-semibold">Project not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This project doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back home
        </Link>
      </div>
    );
  }

  // On desktop the chat is always visible in its own column, so "chat" as a
  // right-pane view just falls back to the preview.
  const rightPane: "preview" | "code" = view === "code" ? "code" : "preview";

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            aria-label="Back to home"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <MonolithMark className="hidden shrink-0 sm:block" />
          {isProjectLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <span className="truncate text-sm font-medium capitalize">
              {(project?.name ?? "").replace(/-/g, " ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <nav
            aria-label="Workspace view"
            className="flex items-center rounded-md border border-border bg-muted/50 p-0.5"
          >
            {VIEWS.map(({ id, label, icon: Icon, mobileOnly }) => {
              const active =
                id === "chat" ? view === "chat" : rightPane === id && view !== "chat";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-pressed={active}
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground",
                    mobileOnly && "lg:hidden",
                    // on desktop the right-pane tabs are "active" whenever chat isn't the mobile view
                    active && "bg-background text-foreground shadow-sm",
                    !mobileOnly &&
                      view === "chat" &&
                      rightPane === id &&
                      "lg:bg-background lg:text-foreground lg:shadow-sm",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden min-[400px]:inline">{label}</span>
                </button>
              );
            })}
          </nav>
          <ModeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section
          aria-label="Chat"
          className={cn(
            "min-h-0 w-full shrink-0 border-border lg:flex lg:w-[400px] lg:border-r xl:w-[440px]",
            view === "chat" ? "flex" : "hidden",
          )}
        >
          <div className="min-h-0 w-full flex-1">
            {isMessagesLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="ml-auto h-16 w-3/4 rounded-lg" />
                <Skeleton className="h-24 w-4/5 rounded-lg" />
              </div>
            ) : (
              <ChatPanel
                messages={messages}
                isWorking={isWorking}
                workingSince={workingSince}
                onRetry={handleRetry}
                activeFragmentId={activeFragment?.id}
                onSend={handleSend}
                onSelectFragment={handleSelectFragment}
              />
            )}
          </div>
        </section>

        <section
          aria-label="Workspace"
          className={cn(
            "min-h-0 min-w-0 flex-1 lg:block",
            view === "chat" ? "hidden" : "block",
          )}
        >
          {rightPane === "preview" ? (
            <PreviewPane
              projectId={projectId}
              fragment={activeFragment}
              isBuilding={isWorking}
            />
          ) : (
            <CodeView fragment={activeFragment} />
          )}
        </section>
      </div>
    </div>
  );
}
