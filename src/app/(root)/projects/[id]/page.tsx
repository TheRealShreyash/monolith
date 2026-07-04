"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Code2, Eye } from "lucide-react";
import { ChatPanel } from "@/components/project/chat-panel";
import { CodeView } from "@/components/project/code-view";
import { PreviewPane } from "@/components/project/preview-pane";
import { Fragment, ProjectMessage } from "@/components/project/types";
// TODO: replace with real fetch (tRPC/server action/API route) once wired up.
// Keep this shape — id, role, type, content, createdAt, fragment? — so
// swapping the data source doesn't require touching ChatPanel/CodeView/PreviewPane.
const mockMessages: ProjectMessage[] = [
  {
    id: "1",
    role: "USER",
    type: "TEXT",
    content: "Build a landing page for an AI fitness coach app",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    role: "ASSISTANT",
    type: "RESULT",
    content:
      "Alright, all done! I've whipped up a landing page for your AI fitness coach app. It's got a hero section, a pricing breakdown with three tiers, and a testimonials carousel.",
    createdAt: new Date().toISOString(),
    fragment: {
      id: "frag-1",
      title: "AI Fitness Landing",
      sandboxUrl: "http://3000-i2vb1ynpizghlvqu0jsr8.e2b.app",
      files: {
        "app/page.tsx": `export default function Home() {\n  return <div>Hello</div>;\n}\n`,
        "app/components/HeroSection.tsx": `export function HeroSection() {\n  return <section>Hero</section>;\n}\n`,
      },
    },
  },
];

const Project = () => {
  const [messages, setMessages] = useState<ProjectMessage[]>(mockMessages);
  const [isWorking, setIsWorking] = useState(false);
  const [activeFragment, setActiveFragment] = useState<Fragment | null>(
    mockMessages.findLast((m) => m.fragment)?.fragment ?? null,
  );
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");

  // TODO: swap this for a real mutation (trigger the code-agent event) +
  // real polling of messages while isWorking. Structure below is the seam:
  //
  // useEffect(() => {
  //   if (!isWorking) return;
  //   const interval = setInterval(async () => {
  //     const latest = await fetchMessages(projectId);
  //     setMessages(latest);
  //     const stillRunning = latest.at(-1)?.role !== "ASSISTANT";
  //     if (!stillRunning) setIsWorking(false);
  //   }, 2000);
  //   return () => clearInterval(interval);
  // }, [isWorking]);

  const handleSend = (value: string) => {
    const userMessage: ProjectMessage = {
      id: crypto.randomUUID(),
      role: "USER",
      type: "TEXT",
      content: value,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsWorking(true);

    // mock response for now
    setTimeout(() => {
      setIsWorking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ASSISTANT",
          type: "RESULT",
          content: "(mock response — wire up the real event trigger here)",
          createdAt: new Date().toISOString(),
        },
      ]);
    }, 1500);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="w-[400px] shrink-0">
        <ChatPanel
          messages={messages}
          isWorking={isWorking}
          activeFragmentId={activeFragment?.id}
          onSend={handleSend}
          onSelectFragment={setActiveFragment}
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "code" | "preview")}
          className="flex h-full flex-col"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <TabsList>
              <TabsTrigger value="code" className="gap-1.5">
                <Code2 className="h-3.5 w-3.5" />
                Code
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="code" className="flex-1 min-h-0 m-0">
            <CodeView fragment={activeFragment} />
          </TabsContent>
          <TabsContent value="preview" className="flex-1 min-h-0 m-0">
            <PreviewPane fragment={activeFragment} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Project;
