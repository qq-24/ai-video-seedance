import { prisma } from "./client";
import type { VideoChain, VideoChainItem, Video } from "@prisma/client";

export class VideoChainError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "database_error"
  ) {
    super(message);
    this.name = "VideoChainError";
  }
}

export async function createVideoChain(data: {
  projectId: string;
  name?: string;
}): Promise<VideoChain> {
  return prisma.videoChain.create({
    data: {
      projectId: data.projectId,
      name: data.name ?? null,
    },
  });
}

export async function getVideoChainsByProjectId(projectId: string): Promise<VideoChain[]> {
  return prisma.videoChain.findMany({
    where: { projectId },
  });
}

export async function getVideoChainWithItems(chainId: string): Promise<{
  chain: VideoChain;
  items: (VideoChainItem & { video: Video })[];
} | null> {
  const chain = await prisma.videoChain.findUnique({
    where: { id: chainId },
    include: {
      items: {
        orderBy: { orderIndex: "asc" },
        include: { video: true },
      },
    },
  });

  if (!chain) return null;

  return {
    chain,
    items: chain.items,
  };
}

export async function appendVideoToChain(
  chainId: string,
  videoId: string,
  parentVideoId?: string
): Promise<VideoChainItem> {
  const existingItems = await prisma.videoChainItem.findMany({
    where: { chainId },
    orderBy: { orderIndex: "desc" },
    take: 1,
  });

  const nextOrderIndex = (existingItems[0]?.orderIndex ?? -1) + 1;

  return prisma.videoChainItem.create({
    data: {
      chainId,
      videoId,
      orderIndex: nextOrderIndex,
      parentVideoId: parentVideoId ?? null,
    },
  });
}

export async function removeVideoFromChain(chainId: string, videoId: string): Promise<void> {
  await prisma.videoChainItem.deleteMany({
    where: { chainId, videoId },
  });
}

export async function updateChainItemOrder(chainItemId: string, orderIndex: number): Promise<VideoChainItem> {
  return prisma.videoChainItem.update({
    where: { id: chainItemId },
    data: { orderIndex },
  });
}

export async function deleteVideoChain(chainId: string): Promise<void> {
  await prisma.videoChain.delete({
    where: { id: chainId },
  });
}

export async function getVideoChainByVideoId(videoId: string): Promise<VideoChainItem | null> {
  return prisma.videoChainItem.findFirst({
    where: { videoId },
  });
}
