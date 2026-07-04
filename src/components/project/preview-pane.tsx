"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Fragment } from "./types";

interface PreviewPaneProps {
  fragment: Fragment | null;
}

export function PreviewPane({ fragment }: PreviewPaneProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  if (!fragment?.sandboxUrl) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No preview yet.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="truncate text-xs text-muted-foreground">
          {fragment.sandboxUrl}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => window.open(fragment.sandboxUrl, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <iframe
        key={refreshKey}
        src={fragment.sandboxUrl}
        className="h-full w-full flex-1 border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
