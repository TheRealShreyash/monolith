"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, Check, File } from "lucide-react";
import { Fragment } from "./types";
import { cn } from "@/lib/utils";

interface CodeViewProps {
  fragment: Fragment | null;
}

export function CodeView({ fragment }: CodeViewProps) {
  const files = fragment?.files ?? {};
  const filePaths = Object.keys(files);
  const [selected, setSelected] = useState(filePaths[0] ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!filePaths.includes(selected)) {
      setSelected(filePaths[0] ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragment]);

  if (!fragment || filePaths.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No files yet.
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(files[selected] ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0 border-r border-border">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-0.5 p-2">
            {filePaths.map((path) => (
              <button
                key={path}
                onClick={() => setSelected(path)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                  selected === path && "bg-accent font-medium",
                )}
              >
                <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{path}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="truncate text-xs text-muted-foreground">
            {selected}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <pre className="p-4 text-xs leading-relaxed">
            <code>{files[selected]}</code>
          </pre>
        </ScrollArea>
      </div>
    </div>
  );
}
