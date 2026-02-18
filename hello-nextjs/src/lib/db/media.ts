import { prisma } from "./client";
import { uploadFile, deleteByPath, type StorageBucket } from "@/lib/storage";
import type { Image, Video } from "@prisma/client";

export class MediaError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "storage_error" | "database_error"
  ) {
    super(message);
    this.name = "MediaError";
  }
}

export async function createImage(
  sceneId: string,
  storagePath: string,
  url: string,
  options: { width?: number; height?: number } = {}
): Promise<Image> {
  const existingImages = await prisma.image.findMany({
    where: { sceneId },
    orderBy: { version: "desc" },
    take: 1,
  });

  const nextVersion = (existingImages[0]?.version ?? 0) + 1;

  return prisma.image.create({
    data: {
      sceneId,
      storagePath,
      url,
      width: options.width ?? null,
      height: options.height ?? null,
      version: nextVersion,
    },
  });
}

export async function getImagesBySceneId(sceneId: string): Promise<Image[]> {
  return prisma.image.findMany({
    where: { sceneId },
    orderBy: { version: "desc" },
  });
}

export async function getLatestImageBySceneId(sceneId: string): Promise<Image | null> {
  return prisma.image.findFirst({
    where: { sceneId },
    orderBy: { version: "desc" },
  });
}

export async function getImageById(imageId: string): Promise<Image> {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    throw new MediaError("Image not found", "not_found");
  }

  return image;
}

export async function deleteImagesBySceneId(sceneId: string): Promise<number> {
  const result = await prisma.image.deleteMany({
    where: { sceneId },
  });

  return result.count;
}

export async function createVideo(
  sceneId: string,
  storagePath: string,
  url: string,
  options: { duration?: number; taskId?: string } = {}
): Promise<Video> {
  const existingVideos = await prisma.video.findMany({
    where: { sceneId },
    orderBy: { version: "desc" },
    take: 1,
  });

  const nextVersion = (existingVideos[0]?.version ?? 0) + 1;

  return prisma.video.create({
    data: {
      sceneId,
      storagePath,
      url,
      duration: options.duration ?? null,
      taskId: options.taskId ?? null,
      version: nextVersion,
    },
  });
}

export async function updateVideoTaskId(videoId: string, taskId: string): Promise<Video> {
  return prisma.video.update({
    where: { id: videoId },
    data: { taskId },
  });
}

export async function createProcessingVideo(sceneId: string, taskId: string): Promise<Video> {
  const existingVideos = await prisma.video.findMany({
    where: { sceneId },
    orderBy: { version: "desc" },
    take: 1,
  });

  const nextVersion = (existingVideos[0]?.version ?? 0) + 1;

  return prisma.video.create({
    data: {
      sceneId,
      storagePath: "",
      url: "",
      taskId,
      version: nextVersion,
    },
  });
}

export async function updateCompletedVideo(
  videoId: string,
  storagePath: string,
  url: string,
  options: { duration?: number } = {}
): Promise<Video> {
  return prisma.video.update({
    where: { id: videoId },
    data: {
      storagePath,
      url,
      duration: options.duration ?? null,
    },
  });
}

export async function getLatestVideoBySceneIdWithTask(sceneId: string): Promise<Video | null> {
  return prisma.video.findFirst({
    where: { sceneId },
    orderBy: { version: "desc" },
  });
}

export async function getVideosBySceneId(sceneId: string): Promise<Video[]> {
  return prisma.video.findMany({
    where: { sceneId },
    orderBy: { version: "desc" },
  });
}

export async function getLatestVideoBySceneId(sceneId: string): Promise<Video | null> {
  return prisma.video.findFirst({
    where: { sceneId },
    orderBy: { version: "desc" },
  });
}

export async function getVideoById(videoId: string): Promise<Video> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    throw new MediaError("Video not found", "not_found");
  }

  return video;
}

export async function deleteVideosBySceneId(sceneId: string): Promise<number> {
  const result = await prisma.video.deleteMany({
    where: { sceneId },
  });

  return result.count;
}

export function getSignedUrl(storagePath: string): string {
  return `/${storagePath}`;
}

export function getSignedUrls(paths: string[], _expiresIn?: number): Map<string, string> {
  const urlMap = new Map<string, string>();
  for (const path of paths) {
    urlMap.set(path, getSignedUrl(path));
  }
  return urlMap;
}

export async function uploadAndCreateImage(
  _userId: string,
  _projectId: string,
  sceneId: string,
  fileName: string,
  imageData: Buffer | string,
  options: { width?: number; height?: number; contentType?: string } = {}
): Promise<Image> {
  const buffer = typeof imageData === "string" ? Buffer.from(imageData, "base64") : imageData;

  const { path, url } = await uploadFile("images" as StorageBucket, fileName, buffer);

  return createImage(sceneId, path, url, {
    width: options.width,
    height: options.height,
  });
}

export async function uploadAndCreateVideo(
  _userId: string,
  _projectId: string,
  sceneId: string,
  fileName: string,
  videoData: Buffer,
  options: { duration?: number; taskId?: string; contentType?: string } = {}
): Promise<Video> {
  const { path, url } = await uploadFile("videos" as StorageBucket, fileName, videoData);

  return createVideo(sceneId, path, url, {
    duration: options.duration,
    taskId: options.taskId,
  });
}

export async function deleteFile(storagePath: string): Promise<void> {
  await deleteByPath(storagePath);
}

export async function deleteOldSceneImages(sceneId: string): Promise<void> {
  const images = await getImagesBySceneId(sceneId);

  for (const img of images) {
    if (img.storagePath) {
      await deleteByPath(img.storagePath).catch(() => {});
    }
  }

  await deleteImagesBySceneId(sceneId);
}

export async function deleteOldSceneVideos(sceneId: string): Promise<void> {
  const videos = await getVideosBySceneId(sceneId);

  for (const vid of videos) {
    if (vid.storagePath) {
      await deleteByPath(vid.storagePath).catch(() => {});
    }
  }

  await deleteVideosBySceneId(sceneId);
}

export async function getMediaBySceneId(sceneId: string): Promise<{
  images: Image[];
  videos: Video[];
}> {
  const [images, videos] = await Promise.all([
    getImagesBySceneId(sceneId),
    getVideosBySceneId(sceneId),
  ]);

  return { images, videos };
}

export async function downloadAndUpload(
  url: string,
  _userId: string,
  _projectId: string,
  fileName: string,
  bucket: StorageBucket = "images"
): Promise<{ path: string; url: string }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new MediaError(`Failed to download file: ${response.status}`, "storage_error");
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  return uploadFile(bucket, fileName, buffer);
}
