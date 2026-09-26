import type { AgentResult } from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";

export interface CodeAgentState {
  sandboxId: string;
  summary: string;
  files: Record<string, string>;
}

function textFromMessage(
  message: AgentResult["output"][number],
): string | undefined {
  if (message.type !== "text") {
    return undefined;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => (typeof part === "string" ? part : (part.text ?? "")))
      .join("");
  }

  return message.content;
}

export function agentOutputText(
  output: AgentResult["output"],
  fallback: string,
): string {
  return lastAssistantTextMessageContent({ output } as AgentResult) ?? fallback;
}

/** Pull the text inside `<tag>...</tag>` out of a model reply, if present. */
export function extractTag(text: string, tag: string): string | undefined {
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match?.[1]?.trim();
}

/** Save `<task_summary>` from the agent's latest reply into network state. */
export function captureTaskSummary(
  result: AgentResult,
  network?: { state: { data: { summary?: string } } },
) {
  const text = lastAssistantTextMessageContent(result);
  if (text?.includes("<task_summary>") && network) {
    network.state.data.summary = text;
  }
}

export const SANDBOX_TEMPLATE = "qcb796qief9efk790yuk";
// 1 hour is the max E2B allows on the Hobby tier (default is 5 minutes).
export const SANDBOX_TIMEOUT_MS = 60 * 60 * 1000;

export async function connectSandbox(sandboxId: string) {
  return Sandbox.connect(sandboxId);
}

export async function createSandbox() {
  return Sandbox.create({
    template: SANDBOX_TEMPLATE,
    timeoutMs: SANDBOX_TIMEOUT_MS,
  });
}

/** Write a path -> content map into a sandbox (used to restore a project). */
export async function writeFilesToSandbox(
  sandbox: Sandbox,
  files: Record<string, string>,
) {
  for (const [path, content] of Object.entries(files)) {
    await sandbox.files.write(path, content);
  }
}

/**
 * Ask the sandbox's dev server for the home page. A Next.js compile/runtime
 * error comes back as HTTP 500 with the error in the body — returns that
 * error text, or null when the page renders fine.
 */
export async function checkDevServer(
  sandboxId: string,
): Promise<string | null> {
  const sandbox = await Sandbox.connect(sandboxId);
  // give hot reload a moment to pick up the last file write
  await sandbox.commands.run("sleep 4");
  const result = await sandbox.commands.run(
    `curl -s -m 30 -w "\\n__STATUS__%{http_code}" http://localhost:3000`,
    { timeoutMs: 45_000 },
  );
  const out = result.stdout;
  const status = out.match(/__STATUS__(\d+)\s*$/)?.[1];
  if (status && status.startsWith("2")) return null;

  const body = out
    .replace(/__STATUS__\d+\s*$/, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `HTTP ${status ?? "unknown"}: ${body.slice(0, 1500)}`;
}

export function lastAssistantTextMessageContent(result: AgentResult) {
  const lastAssistantTextMessageIndex = result.output.findLastIndex(
    (message) => message.role === "assistant",
  );

  // No assistant message at all (empty / filtered model response) — treat
  // as "no text" so the agent loop can simply take another turn.
  if (lastAssistantTextMessageIndex === -1) return undefined;

  const message = result.output[lastAssistantTextMessageIndex];
  if (!message) return undefined;
  return textFromMessage(message);
}
