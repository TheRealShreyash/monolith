"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, FileCode2 } from "lucide-react";
import type { Fragment, ProjectMessage } from "./types";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  messages: ProjectMessage[];
  isWorking: boolean;
  activeFragmentId?: string;
  onSend: (value: string) => void;
  onSelectFragment: (fragment: Fragment) => void;
}

export function ChatPanel({
  messages,
  isWorking,
  activeFragmentId,
  onSend,
  onSelectFragment,
}: ChatPanelProps) {
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isWorking]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isWorking) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="flex h-full flex-col border-r border-border">
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-2",
                message.role === "USER" ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  message.role === "USER"
                    ? "bg-primary text-primary-foreground"
                    : message.type === "ERROR"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-secondary text-secondary-foreground",
                )}
              >
                {message.content}
              </div>

              {message.fragment && (
                <button
                  onClick={() => onSelectFragment(message.fragment!)}
                  className={cn(
                    "flex w-[85%] items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent",
                    activeFragmentId === message.fragment.id &&
                      "border-primary/50 bg-accent",
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileCode2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {message.fragment.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(message.fragment.files).length} files
                    </p>
                  </div>
                </button>
              )}
            </div>
          ))}

          {isWorking && (
            <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground w-fit">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Agent is working...
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask for a change..."
            rows={1}
            className="max-h-40 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button
            size="icon"
            className="shrink-0 rounded-xl"
            disabled={!value.trim() || isWorking}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
