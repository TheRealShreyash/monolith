"use client";

import { useState } from "react";
import { Navbar } from "@/components/home/navbar";
import { PromptInput } from "@/components/home/prompt-input";
import { PromptTemplates } from "@/components/home/prompt-templates";
import { ProjectGrid } from "@/features/projects/components/project-grid";

export default function Home() {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[640px]">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-brand/[0.06] to-transparent" />
      </div>

      <Navbar />

      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <div className="animate-fade-up text-center">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            AI app builder
          </p>
          <h1 className="text-balance font-display text-4xl font-semibold leading-[1.06] tracking-tight sm:text-6xl">
            Describe it.
            <br />
            <span className="text-brand">Watch it rise.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-pretty text-base text-muted-foreground sm:text-lg">
            Tell Monolith what to build. It writes the code, runs it, and gives
            you a live preview you can keep refining.
          </p>
        </div>

        <div className="mt-10">
          <PromptInput value={prompt} onChange={setPrompt} />
        </div>

        <div className="mt-16 space-y-14">
          <PromptTemplates onSelect={setPrompt} />
          <ProjectGrid />
        </div>
      </main>
    </div>
  );
}
