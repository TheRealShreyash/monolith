"use client";

import { useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function PromptInput({ value, onChange, onSubmit }: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleInput(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);

    // Autosize: reset then grow to fit content, capped so it never
    // takes over the screen.
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends the prompt. Shift+Enter inserts a newline as usual.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        onSubmit(trimmed);
      }
    }
  }

  function handleSubmitClick() {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      onSubmit(trimmed);
    }
  }

  return (
    <div className="group relative w-full max-w-2xl">
      <div
        className={cn(
          "relative rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur-sm transition-all",
          "focus-within:border-teal-500/40 focus-within:shadow-[0_0_0_1px_rgba(45,212,191,0.15),0_0_40px_-12px_rgba(45,212,191,0.35)]",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Describe the product you want to build..."
          rows={1}
          className="w-full resize-none bg-transparent px-5 pb-2 pt-5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach
          </button>

          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={!value.trim()}
            aria-label="Send prompt"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Signature element: a glowing seam beneath the slab that
         brightens when the input is focused — the monolith waking up. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 -bottom-3 h-2 rounded-full bg-teal-400/0 blur-md transition-all duration-500 group-focus-within:bg-teal-400/40"
      />
    </div>
  );
}
