export type { Project, Scene, Image, Video, Material, VideoChain, VideoChainItem, Setting } from "@prisma/client";

export type project_stage = "draft" | "scenes" | "images" | "videos" | "completed";
export type scene_mode = "story" | "free";
export type image_status = "pending" | "processing" | "completed" | "failed";
export type video_status = "pending" | "processing" | "completed" | "failed";
export type material_type = "audio" | "video" | "image" | "text";

export type ProjectInsert = {
  title: string;
  story?: string | null;
  style?: string | null;
  stage?: project_stage;
  mode?: scene_mode;
};

export type SceneInsert = {
  projectId: string;
  orderIndex: number;
  description: string;
  descriptionConfirmed?: boolean;
  imageStatus?: image_status;
  imageConfirmed?: boolean;
  videoStatus?: video_status;
  videoConfirmed?: boolean;
};

export type ImageInsert = {
  sceneId: string;
  storagePath: string;
  url: string;
  width?: number | null;
  height?: number | null;
  version?: number;
};

export type VideoInsert = {
  sceneId: string;
  storagePath: string;
  url: string;
  duration?: number | null;
  taskId?: string | null;
  version?: number;
};

export type MaterialInsert = {
  sceneId: string;
  type: material_type;
  storagePath: string;
  url: string;
  metadata?: string | null;
  orderIndex?: number;
};

export type VideoChainInsert = {
  projectId: string;
  name?: string | null;
};

export type VideoChainItemInsert = {
  chainId: string;
  videoId: string;
  orderIndex?: number;
  parentVideoId?: string | null;
};

export type SceneWithImages = {
  id: string;
  projectId: string;
  orderIndex: number;
  description: string;
  descriptionConfirmed: boolean;
  imageStatus: image_status;
  imageConfirmed: boolean;
  videoStatus: video_status;
  videoConfirmed: boolean;
  createdAt: Date;
  images: Image[];
};

export type SceneWithMedia = SceneWithImages & {
  videos: Video[];
};

export type ProjectWithScenes = {
  id: string;
  title: string;
  story: string | null;
  style: string | null;
  stage: string;
  mode: string;
  createdAt: Date;
  updatedAt: Date;
  scenes: (Scene & {
    images: Image[];
    videos: Video[];
  })[];
};

import type { Project, Scene, Image, Video, Material, VideoChain, VideoChainItem, Setting } from "@prisma/client";
