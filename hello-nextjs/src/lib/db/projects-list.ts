/**
 * Project list data access.
 * Fetches projects with preview images.
 */

import { prisma } from "./client";
import type { Project } from "@prisma/client";
import { getSignedUrl } from "./media";

/**
 * Project with preview image for list display
 */
export interface ProjectWithPreview extends Project {
  previewImageUrl: string | null;
  sceneCount: number;
}

/**
 * Get all projects with preview images
 * @param options - Pagination options
 * @returns Array of projects with previews and total count
 */
export async function getProjectsWithPreview(
  _userId?: string,
  options: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{ projects: ProjectWithPreview[]; total: number }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const skip = (page - 1) * limit;

  console.log("[getProjectsWithPreview] Fetching projects with pagination", { page, limit, skip });

  // Get projects with count
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.project.count(),
  ]);

  console.log("[getProjectsWithPreview] Found projects:", projects.length, "total:", total);

  if (!projects || projects.length === 0) {
    return {
      projects: [],
      total,
    };
  }

  // Get project IDs
  const projectIds = projects.map((p) => p.id);

  // Get scene counts and first scenes for each project
  const scenes = await prisma.scene.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { orderIndex: "asc" },
    include: { images: { orderBy: { version: "desc" }, take: 1 } },
  });

  console.log("[getProjectsWithPreview] Found scenes:", scenes.length);

  // Count scenes per project and get first scene's image
  const sceneCountMap = new Map<string, number>();
  const firstSceneMap = new Map<string, { imageUrl: string | null }>();

  for (const scene of scenes) {
    // Update scene count
    const currentCount = sceneCountMap.get(scene.projectId) ?? 0;
    sceneCountMap.set(scene.projectId, currentCount + 1);

    // Set first scene image if not already set
    if (!firstSceneMap.has(scene.projectId) && scene.images.length > 0) {
      const image = scene.images[0];
      const previewUrl = image.storagePath ? getSignedUrl(image.storagePath) : image.url;
      firstSceneMap.set(scene.projectId, { imageUrl: previewUrl });
    }
  }

  // Combine all data
  const projectsWithPreview: ProjectWithPreview[] = projects.map((project) => {
    const firstSceneData = firstSceneMap.get(project.id);
    
    return {
      ...project,
      previewImageUrl: firstSceneData?.imageUrl ?? null,
      sceneCount: sceneCountMap.get(project.id) ?? 0,
    };
  });

  console.log("[getProjectsWithPreview] Returning projects with preview:", projectsWithPreview.length);

  return {
    projects: projectsWithPreview,
    total,
  };
}
