import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMessage,
  createProject,
  extendSandboxTimeout,
  getMessages,
  getProjectById,
  getProjects,
  restoreSandbox,
} from "../actions";

export type ActionError = {
  error: string;
};

function isActionError(value: unknown): value is ActionError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ActionError).error === "string"
  );
}

async function unwrapActionResult<T>(
  result: T | { error: string },
): Promise<T> {
  if (isActionError(result)) {
    throw new Error(result.error);
  }

  return result;
}

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: string) => {
      return unwrapActionResult(await createProject(value));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

export const useGetProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => unwrapActionResult(await getProjects()),
  });
};

export const useGetProjectById = (id: string) => {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => unwrapActionResult(await getProjectById(id)),
  });
};

export const useGetMessages = (projectId: string) => {
  return useQuery({
    queryKey: ["messages", projectId],
    queryFn: async () => unwrapActionResult(await getMessages(projectId)),
    // Keep polling while the last message is still waiting on the agent
    // (i.e. it hasn't replied yet); stop once the assistant has responded.
    refetchInterval: (query) => {
      const messages = query.state.data;
      const last = messages?.[messages.length - 1];
      return last && last.role !== "ASSISTANT" ? 2000 : false;
    },
  });
};

export const useCreateMessage = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: string) =>
      unwrapActionResult(await createMessage(projectId, value)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", projectId] });
    },
  });
};

export const useExtendSandboxTimeout = () => {
  return useMutation({
    mutationFn: async (sandboxUrl: string) =>
      unwrapActionResult(await extendSandboxTimeout(sandboxUrl)),
  });
};

export const useRestoreSandbox = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fragmentId: string) =>
      unwrapActionResult(await restoreSandbox(fragmentId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", projectId] });
    },
  });
};
