"use client";

import { useState } from "react";
import { Check, Copy, FileCode2, FolderOpen } from "lucide-react";
import { Fragment } from "./types";
import { cn } from "@/lib/utils";

interface CodeViewProps {
  fragment: Fragment | null;
}

export function CodeView({ fragment }: CodeViewProps) {
  const files = fragment?.files ?? {};
  const filePaths = Object.keys(files);
  // Manual picks win as long as they're still valid for the current
  // fragment; otherwise fall back to the first file. Fully derived, so
  // switching fragments never needs an effect to "resync" state.
  const [manualSelected, setManualSelected] = useState<string | null>(null);
  const selected =
    manualSelected && filePaths.includes(manualSelected)
      ? manualSelected
      : (filePaths[0] ?? "");
  const [copied, setCopied] = useState(false);

  if (!fragment || filePaths.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
          <FolderOpen className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium">No files yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Generated source files will show up here.
        </p>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(files[selected] ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context / denied) — ignore
    }
  };

  const lines = (files[selected] ?? "").split("\n");

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div className="scrollbar-thin flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 md:w-60 md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r">
        {filePaths.map((path) => (
          <button
            key={path}
            onClick={() => setManualSelected(path)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              selected === path && "bg-accent text-foreground",
            )}
          >
            <FileCode2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{path}</span>
          </button>
        ))}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="truncate font-mono text-xs text-muted-foreground">
            {selected}
          </span>
          <button
            type="button"
            aria-label="Copy file"
            onClick={handleCopy}
            className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy
              </>
            )}
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
          <pre className="flex min-w-max py-4 font-mono text-xs leading-6">
            <span
              aria-hidden="true"
              className="select-none px-4 text-right text-muted-foreground/50"
            >
              {lines.map((_, i) => (
                <span key={i} className="block">
                  {i + 1}
                </span>
              ))}
            </span>
            <code className="pr-6">{files[selected]}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
