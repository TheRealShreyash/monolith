"use client";

import Link from "next/link";
import { ModeToggle } from "../ui/mode-toggle";
import { Button } from "@/components/ui/button";
import { UserButton, useAuth } from "@clerk/nextjs";

export function MonolithMark({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="5" y="2" width="14" height="20" rx="2" className="fill-foreground" />
      <rect
        x="8"
        y="15"
        width="8"
        height="1.6"
        rx="0.8"
        className="fill-background"
      />
    </svg>
  );
}

export function Navbar() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <MonolithMark className="transition-transform duration-300 " />
          <span className="font-display text-base font-semibold tracking-tight">
            Monolith
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          <a
            href="#templates"
            className="rounded-md px-3 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
          >
            Templates
          </a>
          <a
            href="#projects"
            className="rounded-md px-3 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
          >
            Your projects
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ModeToggle />
          {isLoaded &&
            (isSignedIn ? (
              <UserButton />
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  asChild
                >
                  <Link href="/signin">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signin">Get started</Link>
                </Button>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}
