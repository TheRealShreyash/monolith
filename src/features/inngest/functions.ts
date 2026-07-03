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
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/lib/prompt";
import { z } from "zod";
import { agentOutputText, lastAssistantTextMessageContent } from "./utils";

export interface CodeAgentState {
  sandboxId: string;
  summary: string;
  files: Record<string, string>;
}

export const codeAgentFunction = inngest.createFunction(
  {
    id: "code-agent",
    triggers: [{ event: "code-agent/run" }],
  },

  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create({
        template: "qcb796qief9efk790yuk",
      });

      return sandbox.sandboxId;
    });

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

        return messages.map((message) => ({
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

    const geminiModel = gemini({
      model: "gemini-2.5-flash",
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
      model: gemini({ model: "gemini-2.5-flash" }),
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
          console.log(result);

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
      maxIter: 15,
      router: ({ network }) => {
        return network.state.data.summary ? undefined : codeAgent;
      },
    });

    const result = await network.run(event.data.value, { state });
    const { summary, files } = result.state.data;

    const makeTestAgent = (name: string, system: string) =>
      createAgent({ name, system, model: geminiModel });

    const fragmentTitleGenerator = makeTestAgent(
      "fragment-title-generator",
      FRAGMENT_TITLE_PROMPT,
    );

    const responseGenerator = makeTestAgent(
      "response-generator",
      RESPONSE_PROMPT,
    );

    const [{ output: fragmentTitleOutput }, { output: responseOutput }] =
      await Promise.all([
        fragmentTitleGenerator.run(summary, { step }),
        responseGenerator.run(summary, { step }),
      ]);

    const fragmentTitle = agentOutputText(fragmentTitleOutput, "Untitled");
    const responseText = agentOutputText(responseOutput, "Here you go");
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
  },
);
