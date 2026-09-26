"use server";
import { generateSlug } from "random-word-slugs";
import { Sandbox } from "@e2b/code-interpreter";
import { getCurrentUser } from "@/features/auth/actions";
import { prisma } from "@/lib/db";
import { MessageRole, MessageType } from "@/generated/prisma/enums";
import { inngest } from "@/features/inngest/client";
import {
  createSandbox,
  SANDBOX_TIMEOUT_MS,
  writeFilesToSandbox,
} from "@/features/inngest/utils";


export const createProject = async (value: string) => {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: generateSlug(2, { format: "kebab" }),
        userId: user.id,
        messages: {
          create: {
            content: value,
            role: MessageRole.USER,
            type: MessageType.RESULT,
          },
        },
      },
    });

    await inngest.send({
      name: "code-agent/run",
      data: {
        value,
        projectId: project.id,
      },
    });

    return project;
  } catch (error) {
    console.log(`Error creating project: ${error}`);
    return {
      error: "Failed to create project",
    };
  }
};

export const getProjects = async () => {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return projects;
  } catch (error) {
    console.log(`Error fetching projects: ${error}`);
    return {
      error: "Failed to fetch projects",
    };
  }
};

export const getProjectById = async (id: string) => {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  try {
    const project = await prisma.project.findUnique({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!project) {
      return {
        error: "Project not found",
      };
    }

    return project;
  } catch (error) {
    console.log(`Error fetching project: ${error}`);
    return {
      error: "Failed to fetch project",
    };
  }
};

export const getMessages = async (projectId: string) => {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  try {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return {
        error: "Project not found",
      };
    }

    const messages = await prisma.message.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        fragments: true,
      },
    });

    return messages;
  } catch (error) {
    console.log(`Error fetching messages: ${error}`);
    return {
      error: "Failed to fetch messages",
    };
  }
};

export const createMessage = async (projectId: string, value: string) => {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  try {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return {
        error: "Project not found",
      };
    }

    const message = await prisma.message.create({
      data: {
        projectId,
        content: value,
        role: MessageRole.USER,
        type: MessageType.RESULT,
      },
    });

    await inngest.send({
      name: "code-agent/run",
      data: {
        value,
        projectId,
      },
    });

    return message;
  } catch (error) {
    console.log(`Error creating message: ${error}`);
    return {
      error: "Failed to create message",
    };
  }
};

function sandboxIdFromUrl(sandboxUrl: string) {
  // sandboxUrl looks like "http://3000-<sandboxId>.e2b.app"
  const host = new URL(sandboxUrl).hostname;
  return host.split(".")[0].replace(/^\d+-/, "");
}

// Sandboxes auto-shutdown after their timeout (1h, set at creation) even
// if the process inside is still needed. Called when a preview is opened
// so a sandbox a user is actively looking at doesn't die under them.
export const extendSandboxTimeout = async (sandboxUrl: string) => {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  try {
    const fragment = await prisma.fragment.findFirst({
      where: { sandboxUrl },
      include: { message: { include: { project: true } } },
    });

    if (!fragment || fragment.message.project.userId !== user.id) {
      return {
        error: "Not found",
      };
    }

    await Sandbox.setTimeout(sandboxIdFromUrl(sandboxUrl), SANDBOX_TIMEOUT_MS);

    return { ok: true as const };
  } catch (error) {
    console.log(`Error extending sandbox timeout: ${error}`);
    return {
      error: "Failed to extend sandbox",
    };
  }
};

// Rebuilds a fresh sandbox from a fragment's saved files. Used when the
// original sandbox has expired and the preview is dead.
export const restoreSandbox = async (fragmentId: string) => {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: "Unauthorized",
    };
  }

  try {
    const fragment = await prisma.fragment.findUnique({
      where: { id: fragmentId },
      include: { message: { include: { project: true } } },
    });

    if (!fragment || fragment.message.project.userId !== user.id) {
      return {
        error: "Not found",
      };
    }

    const sandbox = await createSandbox();
    await writeFilesToSandbox(sandbox, fragment.files as Record<string, string>);
    // let the dev server pick the files up before the user sees the preview
    await sandbox.commands.run("sleep 3");

    const sandboxUrl = `http://${sandbox.getHost(3000)}`;
    await prisma.fragment.update({
      where: { id: fragmentId },
      data: { sandboxUrl },
    });

    return { sandboxUrl };
  } catch (error) {
    console.log(`Error restoring sandbox: ${error}`);
    return {
      error: "Failed to restore the preview",
    };
  }
};
