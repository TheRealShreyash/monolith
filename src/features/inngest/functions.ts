import { prisma } from "@/lib/db";
import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import { MessageRole, MessageType } from "@/generated/prisma/enums";
import {
  createAgent,
  createNetwork,
  createState,
  createTool,
  gemini,
} from "@inngest/agent-kit";
import { PROMPT, SUMMARY_PROMPT } from "@/lib/prompt";
import { z } from "zod";
import {
  agentOutputText,
  checkDevServer,
  createSandbox,
  extractTag,
  lastAssistantTextMessageContent,
  writeFilesToSandbox,
  type CodeAgentState,
} from "./utils";

// Single place to change which Gemini model the agents use.
// Override with GEMINI_MODEL in .env (e.g. gemini-2.5-flash) — free-tier quotas
// are counted per model, so switching models gives a separate daily bucket.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export const codeAgentFunction = inngest.createFunction(
  {
    id: "code-agent",
    triggers: [{ event: "code-agent/run" }],
  },

  async ({ event, step }) => {
    try {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await createSandbox();
      return sandbox.sandboxId;
    });

    // Follow-up prompts edit the existing app: load the files from the most
    // recent fragment into the fresh sandbox so the agent isn't starting
    // from an empty template.
    const existingFiles = await step.run("restore-files", async () => {
      const latest = await prisma.fragment.findFirst({
        where: { message: { projectId: event.data.projectId } },
        orderBy: { createdAt: "desc" },
      });
      const files = (latest?.files ?? {}) as Record<string, string>;
      if (Object.keys(files).length === 0) return {};

      const sandbox = await Sandbox.connect(sandboxId);
      await writeFilesToSandbox(sandbox, files);
      return files;
    });
    const existingPaths = Object.keys(existingFiles);

    const previousMessages = await step.run(
      "get-previous-messages",
      async () => {
        const messages = await prisma.message.findMany({
          where: {
            projectId: event.data.projectId,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        // The message that triggered this run is already persisted (it's
        // created before the event is sent) and is passed separately as
        // network.run()'s input below — drop it here so the model doesn't
        // see the same prompt twice.
        return messages.slice(0, -1).map((message) => ({
          type: "text" as const,
          role:
            message.role === MessageRole.ASSISTANT
              ? ("assistant" as const)
              : ("user" as const),
          content: message.content,
        }));
      },
    );

    const state = createState<CodeAgentState>(
      {
        sandboxId,
        summary: "",
        files: {},
      },
      { messages: previousMessages },
    );

    const codeAgentModel = gemini({
      model: GEMINI_MODEL,
      step,
      apiKey: process.env.GEMINI_API_KEY!,
      defaultParameters: {
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 65536,
          thinkingConfig: { thinkingBudget: -1 },
        },
      },
    } as Parameters<typeof gemini>[0]);

    const utilityModel = gemini({
      model: GEMINI_MODEL,
      step,
      apiKey: process.env.GEMINI_API_KEY!,
      defaultParameters: {
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
    } as Parameters<typeof gemini>[0]);

    const codeAgent = createAgent({
      name: "code-agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: codeAgentModel,
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step: toolStep, network }) => {
            return await toolStep?.run("terminal", async () => {
              const buffers = { stdout: "", stderr: "" };

              try {
                const sandbox = await Sandbox.connect(
                  network!.state.data.sandboxId,
                );

                const result = await sandbox.commands.run(command, {
                  onStdout: (data) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data) => {
                    buffers.stderr += data;
                  },
                });
                return result.stdout;
              } catch (error) {
                console.log(
                  `Command failed: ${error} \n stdout: ${buffers.stdout}\n stderr: ${buffers.stderr}`,
                );

                return `Command failed: ${error} \n stdout: ${buffers.stdout}\n stderr: ${buffers.stderr}`;
              }
            });
          },
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            path: z.string(),
            content: z.string(),
          }),
          handler: async ({ path, content }, { step: toolStep, network }) => {
            const result = await toolStep?.run(
              "create-or-update-file",
              async () => {
                try {
                  const sandbox = await Sandbox.connect(
                    network!.state.data.sandboxId,
                  );

                  await sandbox.files.write(path, content);

                  return { ok: true as const, path, content };
                } catch (error) {
                  return { ok: false as const, path, error: String(error) };
                }
              },
            );

            if (result?.ok) {
              network!.state.data.files[result.path] = result.content;
              return `File ${result.path} created or updated`;
            }

            return `Failed to create or update file ${path}: ${
              result?.ok === false ? result.error : "unknown error"
            }`;
          },
        }),
        createTool({
          name: "readFiles",
          description: "Read files in the sandbox",
          parameters: z.object({ files: z.array(z.string()) }),
          handler: async ({ files }, { step: toolStep, network }) => {
            return toolStep?.run(`read-files-${files.length}`, async () => {
              try {
                const sandbox = await Sandbox.connect(
                  network.state.data.sandboxId,
                );

                const contents = [];

                for (const file of files) {
                  contents.push({
                    path: file,
                    content: await sandbox.files.read(file),
                  });
                }

                return JSON.stringify(contents);
              } catch (error) {
                return `Error Reading files ${files.length} :: ${error}`;
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const last = result.output[result.output.length - 1];
          console.log(
            `[code-agent] turn: ${last?.type ?? "empty"}` +
              (last?.type === "tool_call"
                ? ` -> ${last.tools.map((t) => t.name).join(", ")}`
                : ""),
          );

          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork({
      name: "code-agent-network",
      agents: [codeAgent],
      // Bounded well under the free-tier Gemini rate limit (5 requests/min):
      // each turn is one model call, so this caps worst-case request burst
      // per run while still leaving headroom for a real multi-file build.
      maxIter: 20,
      router: ({ network }) => {
        return network.state.data.summary ? undefined : codeAgent;
      },
    });

      const taskInput =
        existingPaths.length > 0
          ? `${event.data.value}\n\n[Context: this is a follow-up. The app already exists in the sandbox with these files: ${existingPaths.join(", ")}. Read the relevant ones with readFiles and edit them in place — do not rebuild from scratch or discard the existing design unless asked.]`
          : event.data.value;

      let result = await network.run(taskInput, { state });

      // The agent can run out of turns mid-build (files written, no final
      // summary). Rather than discard that work, let it continue twice.
      for (
        let attempt = 0;
        attempt < 2 &&
        !result.state.data.summary &&
        Object.keys(result.state.data.files).length > 0;
        attempt++
      ) {
        result = await network.run(
          `You ran out of steps before finishing. Continue where you left off: make sure app/page.tsx exists and every imported file has been created (readFiles to check what exists), finish any missing files, then print the <task_summary>.`,
          { state },
        );
      }

      // Verify: a broken file would otherwise ship silently. If the dev
      // server reports an error, give the agent one shot at fixing it.
      const devError = await step.run("verify-app", async () => {
        try {
          return await checkDevServer(sandboxId);
        } catch {
          return null; // verification is best-effort
        }
      });
      if (devError && result.state.data.summary) {
        state.data.summary = "";
        result = await network.run(
          `The app you just built fails to render. Fix it. Server response: ${devError}\n\nRead the offending files, correct the error, and finish with the <task_summary>.`,
          { state },
        );
      }
      const { summary, files } = result.state.data;

      // One combined call instead of two parallel ones — halves the
      // trailing request burst against the same per-minute quota.
      const summaryAgent = createAgent({
        name: "summary-generator",
        system: SUMMARY_PROMPT,
        model: utilityModel,
      });
      const { output } = await summaryAgent.run(summary, { step });
      const summaryText = agentOutputText(output, "");

      const fragmentTitle = extractTag(summaryText, "task_title") ?? "Untitled";
      const responseText =
        extractTag(summaryText, "task_response") ?? "Here you go";
      const isError = !summary || Object.keys(files || {}).length === 0;

      const sandboxUrl = await step.run("get-sandbox-url", async () => {
        const sandbox = await Sandbox.connect(sandboxId);
        return `http://${sandbox.getHost(3000)}`;
      });

      await step.run("save-result", async () => {
        if (isError) {
          return prisma.message.create({
            data: {
              projectId: event.data.projectId,
              content: "Something went wrong. Please try again",
              role: MessageRole.ASSISTANT,
              type: MessageType.ERROR,
            },
          });
        }

        return prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: responseText,
            role: MessageRole.ASSISTANT,
            type: MessageType.RESULT,
            fragments: {
              create: {
                sandboxUrl,
                title: fragmentTitle,
                files,
              },
            },
          },
        });
      });

      return {
        url: sandboxUrl,
        title: fragmentTitle,
        files,
        summary,
      };
    } catch (error) {
      // Without this, a failure here (e.g. the model provider's rate
      // limit) leaves the chat stuck on "Agent is working..." forever —
      // nothing ever writes a reply. Surface it instead.
      //
      // Deliberately not re-thrown: the quota that just got exhausted is
      // shared across the whole Google Cloud project, not per-run, so
      // letting Inngest's function-level retries hammer it again would
      // only make things worse for every other run using the same key.
      const message = error instanceof Error ? error.message : String(error);
      console.error("[code-agent] run failed:", error);
      const isRateLimited = /RESOURCE_EXHAUSTED|429|quota/i.test(message);

      await step.run("save-error", async () => {
        return prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: isRateLimited
              ? "The AI model hit its quota (rate or daily limit). Wait a minute, and if it keeps happening, the daily free-tier limit is used up — switch models or enable billing."
              : "Something went wrong. Please try again",
            role: MessageRole.ASSISTANT,
            type: MessageType.ERROR,
          },
        });
      });

      return { error: message };
    }
  },
);
