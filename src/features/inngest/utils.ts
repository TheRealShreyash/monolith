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

export async function connectSandbox(sandboxId: string) {
  return Sandbox.connect(sandboxId);
}

export function lastAssistantTextMessageContent(result: AgentResult) {
  const lastAssistantTextMessageIndex = result.output.findLastIndex(
    (message) => message.role === "assistant",
  );

  const message = result.output[lastAssistantTextMessageIndex];
  const text = textFromMessage(message);
  return text;
}
