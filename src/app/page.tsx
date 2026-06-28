"use client";

import { useState } from "react";
import { Navbar } from "@/components/home/navbar";
import { PromptInput } from "@/components/home/prompt-input";
import { PromptTemplates } from "@/components/home/prompt-templates";

export default function Home() {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(value: string) {
    // TODO: wire this up to your generation pipeline / route to a
    // build page. For now this just logs what was sent.
    console.log("Building:", value);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="flex w-full flex-col items-center gap-10 text-center">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Describe it. Watch it rise.
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              One prompt in. A working app out — pages, components, and logic
              included.
            </p>
          </div>

          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleSubmit}
          />

          <PromptTemplates onSelect={setPrompt} />
        </div>
      </main>
    </div>
  );
}
