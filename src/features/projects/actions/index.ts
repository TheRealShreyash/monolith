"use server";
import { generateSlug } from "random-word-slugs";
import { getCurrentUser } from "@/features/auth/actions";
import { prisma } from "@/lib/db";
import { MessageRole, MessageType } from "@/generated/prisma/enums";

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

    // Todo: Send project to inngest

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
