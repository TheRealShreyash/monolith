"use client";

import { useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { useCreateProject } from "@/features/projects/hooks/projects";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
}

const MAX_LENGTH = 2000;

export function PromptInput({ value, onChange }: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: createProject, isPending } = useCreateProject();
  const router = useRouter();
  const canSubmit = value.trim().length > 0 && !isPending;

  function resize() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value.slice(0, MAX_LENGTH));
    resize();
  }

  function submit() {
    if (!canSubmit) return;
    createProject(value.trim(), {
      onSuccess: (project) => router.push(`/projects/${project.id}`),
      onError: (error) => toast.error(error.message),
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/10 transition-all focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        aria-label="Describe what you want to build"
        placeholder="e.g. A pricing page for a project management tool, with a monthly/yearly toggle"
        rows={3}
        className="w-full resize-none bg-transparent px-4 pb-2 pt-4 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-60"
      />

      <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
        <span className="hidden font-mono text-xs text-muted-foreground sm:block">
          Enter to build · Shift+Enter for a new line
        </span>

        <div className="ml-auto flex items-center gap-3">
          {value.length > MAX_LENGTH * 0.8 && (
            <span className="font-mono text-xs text-muted-foreground">
              {value.length}/{MAX_LENGTH}
            </span>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                Build
                <ArrowUp className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
