import { prisma } from "./client";
import type { Scene, Image, Video } from "@prisma/client";

export type SceneWithMedia = Scene & {
  images: Image[];
  videos: Video[];
};

export class SceneError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "database_error"
  ) {
    super(message);
    this.name = "SceneError";
  }
}

export async function createScenes(
  projectId: string,
  scenes: Array<{
    order_index?: number;
    orderIndex?: number;
    description: string;
  }>
): Promise<Scene[]> {
  const data = await prisma.scene.createManyAndReturn({
    data: scenes.map((scene) => ({
      projectId,
      orderIndex: scene.orderIndex ?? scene.order_index ?? 0,
      description: scene.description,
      descriptionConfirmed: false,
      imageStatus: "pending",
      imageConfirmed: false,
      videoStatus: "pending",
      videoConfirmed: false,
    })),
  });

  return data;
}

export async function getScenesByProjectId(projectId: string): Promise<Scene[]> {
  return prisma.scene.findMany({
    where: { projectId },
    orderBy: { orderIndex: "asc" },
  });
}

export async function getScenesWithMediaByProjectId(projectId: string): Promise<SceneWithMedia[]> {
  return prisma.scene.findMany({
    where: { projectId },
    orderBy: { orderIndex: "asc" },
    include: {
      images: true,
      videos: true,
    },
  });
}

export async function getSceneById(sceneId: string): Promise<Scene> {
  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
  });

  if (!scene) {
    throw new SceneError("Scene not found", "not_found");
  }

  return scene;
}

export async function updateSceneDescription(
  sceneId: string,
  description: string
): Promise<Scene> {
  return prisma.scene.update({
    where: { id: sceneId },
    data: { description },
  });
}

export async function confirmSceneDescription(sceneId: string): Promise<Scene> {
  return prisma.scene.update({
    where: { id: sceneId },
    data: { descriptionConfirmed: true },
  });
}

export async function confirmAllDescriptions(projectId: string): Promise<number> {
  const result = await prisma.scene.updateMany({
    where: { projectId },
    data: { descriptionConfirmed: true },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { stage: "images" },
  });

  return result.count;
}

export async function updateSceneImageStatus(
  sceneId: string,
  status: "pending" | "processing" | "completed" | "failed"
): Promise<Scene> {
  return prisma.scene.update({
    where: { id: sceneId },
    data: { imageStatus: status },
  });
}

export async function confirmSceneImage(sceneId: string): Promise<Scene> {
  return prisma.scene.update({
    where: { id: sceneId },
    data: { imageConfirmed: true },
  });
}

export async function confirmAllImages(projectId: string): Promise<number> {
  const result = await prisma.scene.updateMany({
    where: {
      projectId,
      imageStatus: "completed",
    },
    data: { imageConfirmed: true },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { stage: "videos" },
  });

  return result.count;
}

export async function updateSceneVideoStatus(
  sceneId: string,
  status: "pending" | "processing" | "completed" | "failed"
): Promise<Scene> {
  return prisma.scene.update({
    where: { id: sceneId },
    data: { videoStatus: status },
  });
}

export async function confirmSceneVideo(sceneId: string): Promise<Scene> {
  return prisma.scene.update({
    where: { id: sceneId },
    data: { videoConfirmed: true },
  });
}

export async function confirmAllVideos(projectId: string): Promise<number> {
  const result = await prisma.scene.updateMany({
    where: {
      projectId,
      videoStatus: "completed",
    },
    data: { videoConfirmed: true },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { stage: "completed" },
  });

  return result.count;
}

export async function deleteScenesByProjectId(projectId: string): Promise<number> {
  const result = await prisma.scene.deleteMany({
    where: { projectId },
  });

  return result.count;
}

export async function resetSceneImageStatus(sceneId: string): Promise<Scene> {
  return prisma.scene.update({
    where: { id: sceneId },
    data: {
      imageStatus: "pending",
      imageConfirmed: false,
    },
  });
}

export async function resetSceneVideoStatus(sceneId: string): Promise<Scene> {
  return prisma.scene.update({
    where: { id: sceneId },
    data: {
      videoStatus: "pending",
      videoConfirmed: false,
    },
  });
}

export async function getConfirmedDescriptionCount(projectId: string): Promise<number> {
  return prisma.scene.count({
    where: {
      projectId,
      descriptionConfirmed: true,
    },
  });
}

export async function getCompletedImageCount(projectId: string): Promise<number> {
  return prisma.scene.count({
    where: {
      projectId,
      imageStatus: "completed",
    },
  });
}

export async function getCompletedVideoCount(projectId: string): Promise<number> {
  return prisma.scene.count({
    where: {
      projectId,
      videoStatus: "completed",
    },
  });
}
