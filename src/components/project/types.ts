export type MessageRole = "USER" | "ASSISTANT";
export type MessageStatus = "RESULT" | "ERROR" | "TEXT";

export interface Fragment {
  id: string;
  title: string;
  sandboxUrl: string;
  files: Record<string, string>;
}

export interface ProjectMessage {
  id: string;
  role: MessageRole;
  type: MessageStatus;
  content: string;
  createdAt: string;
  fragment?: Fragment;
}
