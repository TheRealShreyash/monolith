"use client";

import Link from "next/link";
import { ModeToggle } from "../ui/mode-toggle";
import { Button } from "@/components/ui/button";
import { UserButton, useAuth } from "@clerk/nextjs";

// Logo glyph: a tall slab with a glowing seam near the base —
// the same motif echoed in the prompt input below.
function MonolithMark() {
  return (
    <svg
      width="14"
      height="22"
      viewBox="0 0 14 22"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="0.5"
        y="0.5"
        width="13"
        height="21"
        rx="1.5"
        className="fill-foreground"
      />
      <rect x="3" y="16" width="8" height="1" className="fill-teal-400" />
    </svg>
  );
}

export function Navbar() {
  // useAuth() requires "use client" — it reads Clerk's session state on
  // the client. isLoaded prevents a flash where buttons briefly appear
  // before Clerk has hydrated.
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <MonolithMark />
          <span className="text-base font-semibold tracking-tight">
            Monolith
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="#" className="transition-colors hover:text-foreground">
            Showcase
          </Link>
          <Link href="#" className="transition-colors hover:text-foreground">
            Templates
          </Link>
          <Link href="#" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="#" className="transition-colors hover:text-foreground">
            Docs
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ModeToggle />

          {/* Hold rendering until Clerk has resolved the session so there's
              no layout shift between the two states. */}
          {isLoaded && (
            <>
              {isSignedIn ? (
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
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}