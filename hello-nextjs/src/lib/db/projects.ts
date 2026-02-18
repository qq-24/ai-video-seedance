import { prisma } from "./client";
import type { Project, Scene, Image, Video } from "@prisma/client";

export type ProjectWithScenes = Project & {
  scenes: (Scene & {
    images: Image[];
    videos: Video[];
  })[];
};

export class ProjectError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "database_error" | "unauthorized"
  ) {
    super(message);
    this.name = "ProjectError";
  }
}

export async function isProjectOwner(projectId: string, userId?: string): Promise<boolean> {
  console.log("[isProjectOwner] Single user mode - always returning true");
  return true;
}

export async function createProject(
  title: string,
  story?: string,
  style?: string,
  mode?: "story" | "free"
): Promise<Project> {
  console.log("[createProject] Creating project:", { title, story: story?.substring(0, 50), style, mode });

  const project = await prisma.project.create({
    data: {
      title,
      story: story ?? null,
      style: style ?? null,
      mode: mode ?? "story",
      stage: "draft",
    },
  });

  console.log("[createProject] Project created:", project.id);
  return project;
}

export async function getProjects(options: {
  page?: number;
  limit?: number;
} = {}): Promise<{ projects: Project[]; total: number }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.project.count(),
  ]);

  return { projects, total };
}

export async function getProjectById(projectId: string): Promise<ProjectWithScenes> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      scenes: {
        orderBy: { orderIndex: "asc" },
        include: {
          images: true,
          videos: true,
        },
      },
    },
  });

  if (!project) {
    throw new ProjectError("Project not found", "not_found");
  }

  return project as ProjectWithScenes;
}

export async function updateProject(
  projectId: string,
  updates: {
    title?: string;
    story?: string;
    style?: string;
    stage?: string;
    mode?: string;
  }
): Promise<Project> {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: updates,
  });

  if (!project) {
    throw new ProjectError("Project not found", "not_found");
  }

  return project;
}

export async function updateProjectStage(
  projectId: string,
  stage: string
): Promise<Project> {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { stage },
  });

  if (!project) {
    throw new ProjectError("Project not found", "not_found");
  }

  return project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await prisma.project.delete({
    where: { id: projectId },
  });
}
