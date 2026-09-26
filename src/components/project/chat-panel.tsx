"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  FileCode2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import type { Fragment, ProjectMessage } from "./types";
import { MarkdownText } from "./markdown-text";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  messages: ProjectMessage[];
  isWorking: boolean;
  /** When the request currently being worked on was sent (ISO string). */
  workingSince?: string;
  activeFragmentId?: string;
  onSend: (value: string) => void;
  onRetry: () => void;
  onSelectFragment: (fragment: Fragment) => void;
}

// Stage labels are keyed off real elapsed time, so a page refresh shows the
// true state instead of restarting from "Planning".
const STAGES = [
  { at: 0, label: "Planning the design" },
  { at: 20, label: "Writing components" },
  { at: 70, label: "Styling and polishing" },
  { at: 130, label: "Wiring up interactions" },
  { at: 200, label: "Final checks" },
];

// A run should never take this long. If nothing has replied by then, the
// background job most likely died — say so instead of spinning forever.
const STALE_AFTER_SECONDS = 10 * 60;

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

function WorkingIndicator({
  since,
  onRetry,
}: {
  since?: string;
  onRetry: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = since
    ? Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
    : 0;
  const stage = [...STAGES].reverse().find((s) => elapsed >= s.at)!;
  const isStale = elapsed > STALE_AFTER_SECONDS;

  if (isStale) {
    return (
      <div className="animate-fade-up space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          This run seems to have stopped
        </p>
        <p className="text-muted-foreground">
          It has been {formatElapsed(elapsed)} with no reply. The background job
          probably failed or was never picked up.
        </p>
        <button
          onClick={onRetry}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-2">
      <div className="flex w-fit items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
        </span>
        <span className="font-medium text-foreground">{stage.label}…</span>
        <span className="font-mono text-xs text-muted-foreground">
          {formatElapsed(elapsed)}
        </span>
      </div>
      {elapsed > 90 && (
        <p className="max-w-[92%] text-xs text-muted-foreground">
          Bigger builds can take a few minutes. If this passes 10 minutes
          you&apos;ll get a retry option.
        </p>
      )}
    </div>
  );
}

export function ChatPanel({
  messages,
  isWorking,
  workingSince,
  activeFragmentId,
  onSend,
  onRetry,
  onSelectFragment,
}: ChatPanelProps) {
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isWorking]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isWorking) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const lastId = messages.at(-1)?.id;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="flex flex-col gap-5">
          {messages.map((message) => {
            const isUser = message.role === "USER";
            const isError = message.type === "ERROR";
            return (
              <div
                key={message.id}
                className={cn(
                  "flex animate-fade-up flex-col gap-2",
                  isUser ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[92%] px-4 py-2.5 text-sm leading-relaxed",
                    isUser
                      ? "rounded-lg bg-primary text-primary-foreground"
                      : isError
                        ? "rounded-lg border border-red-500/40 bg-red-500/10 text-foreground"
                        : "rounded-lg border border-border bg-card text-foreground/90",
                  )}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  ) : isError ? (
                    <div className="space-y-2.5">
                      <p className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                        <span>{message.content}</span>
                      </p>
                      {message.id === lastId && !isWorking && (
                        <button
                          onClick={onRetry}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Try again
                        </button>
                      )}
                    </div>
                  ) : (
                    <MarkdownText content={message.content} />
                  )}
                </div>

                {message.fragment && (
                  <button
                    onClick={() => onSelectFragment(message.fragment!)}
                    className={cn(
                      "group flex w-[92%] items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-brand/40",
                      activeFragmentId === message.fragment.id &&
                        "border-brand/50 bg-brand/5",
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <FileCode2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {message.fragment.title}
                      </span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {Object.keys(message.fragment.files).length} files
                        {activeFragmentId === message.fragment.id &&
                          " · viewing"}
                      </span>
                    </span>
                  </button>
                )}
              </div>
            );
          })}

          {isWorking && (
            <WorkingIndicator since={workingSince} onRetry={onRetry} />
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border bg-background/60 p-3 backdrop-blur">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-1.5 transition-colors focus-within:border-foreground/30">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                handleSend();
              }
            }}
            aria-label="Ask for a change"
            placeholder={
              isWorking ? "Building… hang tight" : "Ask for a change…"
            }
            rows={1}
            className="max-h-36 min-h-9 w-full resize-none bg-transparent px-2 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <button
            aria-label="Send"
            disabled={!value.trim() || isWorking}
            onClick={handleSend}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isWorking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
