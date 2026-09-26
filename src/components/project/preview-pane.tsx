"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  Laptop,
  Loader2,
  MonitorPlay,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Fragment } from "./types";
import {
  useExtendSandboxTimeout,
  useRestoreSandbox,
} from "@/features/projects/hooks/projects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PreviewPaneProps {
  projectId: string;
  fragment: Fragment | null;
  isBuilding?: boolean;
}

const DEVICES = [
  { id: "desktop", label: "Desktop", icon: Laptop, width: "100%" },
  { id: "tablet", label: "Tablet", icon: Tablet, width: "768px" },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: "390px" },
] as const;

type DeviceId = (typeof DEVICES)[number]["id"];

export function PreviewPane({
  projectId,
  fragment,
  isBuilding,
}: PreviewPaneProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [device, setDevice] = useState<DeviceId>("desktop");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const { mutate: extendSandboxTimeout } = useExtendSandboxTimeout();
  const { mutate: restoreSandbox, isPending: isRestoring } =
    useRestoreSandbox(projectId);
  const sandboxUrl = fragment?.sandboxUrl;

  // Sandboxes auto-shutdown after an idle period. Nudge the timeout out
  // whenever a preview is actually being looked at.
  useEffect(() => {
    if (sandboxUrl) extendSandboxTimeout(sandboxUrl);
  }, [sandboxUrl, extendSandboxTimeout]);

  if (!sandboxUrl && isBuilding) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden p-8 text-center">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <div className="relative space-y-1.5">
          <p className="text-base font-medium">Building your app</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Spinning up a sandbox and writing code. The live preview appears
            here the moment it&apos;s ready.
          </p>
        </div>
      </div>
    );
  }

  if (!sandboxUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
          <MonitorPlay className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium">No preview yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Your app will appear here as soon as it&apos;s built.
        </p>
      </div>
    );
  }

  const frameKey = `${sandboxUrl}-${refreshKey}`;
  const isLoading = loadedKey !== frameKey;
  const width = DEVICES.find((d) => d.id === device)!.width;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5">
          <span className="h-2 w-2 shrink-0 rounded-md bg-emerald-500" />
          <span className="truncate font-mono text-xs text-muted-foreground">
            {sandboxUrl.replace(/^https?:\/\//, "")}
          </span>
        </div>

        <div className="hidden items-center rounded-md border border-border bg-muted/50 p-0.5 sm:flex">
          {DEVICES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={device === id}
              onClick={() => setDevice(id)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
                device === id && "bg-background text-foreground shadow-sm",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label="Restore preview"
          title="Preview not loading? Rebuild it from the saved code"
          disabled={isRestoring}
          onClick={() =>
            restoreSandbox(fragment!.id, {
              onSuccess: () => toast.success("Preview restored"),
              onError: (e) => toast.error(e.message),
            })
          }
          className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          <RotateCcw className={cn("h-3.5 w-3.5", isRestoring && "animate-spin")} />
          <span className="hidden md:inline">
            {isRestoring ? "Restoring…" : "Restore"}
          </span>
        </button>
        <button
          type="button"
          aria-label="Refresh preview"
          onClick={() => {
            extendSandboxTimeout(sandboxUrl);
            setRefreshKey((k) => k + 1);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </button>
        <a
          href={sandboxUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open in new tab"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="relative flex min-h-0 flex-1 justify-center bg-muted/30 sm:p-3">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading preview…</p>
          </div>
        )}
        <iframe
          key={frameKey}
          src={sandboxUrl}
          title="App preview"
          onLoad={() => setLoadedKey(frameKey)}
          style={{ width }}
          className={cn(
            "h-full max-w-full border-0 bg-white transition-all duration-300",
            device !== "desktop" &&
              "rounded-lg border border-border shadow-lg",
          )}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
