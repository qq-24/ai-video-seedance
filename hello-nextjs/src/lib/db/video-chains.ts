/**
 * Video chain data access layer.
 * Handles CRUD operations for video chains and chain items.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  VideoChain,
  VideoChainInsert,
  VideoChainItem,
  VideoChainItemInsert,
  Video,
} from "@/types/database";

/**
 * Custom error class for video chain operations
 */
export class VideoChainError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "unauthorized" | "database_error"
  ) {
    super(message);
    this.name = "VideoChainError";
  }
}

/**
 * Create a new video chain
 * @param chain - The video chain data to insert
 * @returns The created video chain
 */
export async function createVideoChain(
  chain: VideoChainInsert
): Promise<VideoChain> {
  const supabase = await createClient();

  console.log("[VideoChain] Creating video chain for project:", chain.project_id);

  const { data, error } = await supabase
    .from("video_chains")
    .insert(chain)
    .select()
    .single();

  if (error) {
    console.error("[VideoChain] Error creating video chain:", error);
    throw new VideoChainError("Failed to create video chain", "database_error");
  }

  console.log("[VideoChain] Video chain created successfully:", data.id);
  return data;
}

/**
 * Get all video chains for a project
 * @param projectId - The project ID
 * @returns Array of video chains
 */
export async function getVideoChainsByProjectId(
  projectId: string
): Promise<VideoChain[]> {
  const supabase = await createClient();

  console.log("[VideoChain] Fetching video chains for project:", projectId);

  const { data, error } = await supabase
    .from("video_chains")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[VideoChain] Error fetching video chains:", error);
    throw new VideoChainError("Failed to fetch video chains", "database_error");
  }

  console.log("[VideoChain] Found", data?.length ?? 0, "video chains");
  return data ?? [];
}

/**
 * Get a video chain with all its items (including video details)
 * @param chainId - The video chain ID
 * @returns The chain with items or null if not found
 */
export async function getVideoChainWithItems(
  chainId: string
): Promise<{
  chain: VideoChain;
  items: (VideoChainItem & { video: Video })[];
} | null> {
  const supabase = await createClient();

  console.log("[VideoChain] Fetching video chain with items:", chainId);

  const { data: chain, error: chainError } = await supabase
    .from("video_chains")
    .select("*")
    .eq("id", chainId)
    .single();

  if (chainError) {
    if (chainError.code === "PGRST116") {
      console.log("[VideoChain] Video chain not found:", chainId);
      return null;
    }
    console.error("[VideoChain] Error fetching video chain:", chainError);
    throw new VideoChainError("Failed to fetch video chain", "database_error");
  }

  const { data: items, error: itemsError } = await supabase
    .from("video_chain_items")
    .select("*")
    .eq("chain_id", chainId)
    .order("order_index", { ascending: true });

  if (itemsError) {
    console.error("[VideoChain] Error fetching chain items:", itemsError);
    throw new VideoChainError("Failed to fetch chain items", "database_error");
  }

  if (!items || items.length === 0) {
    console.log("[VideoChain] No items in chain");
    return {
      chain,
      items: [],
    };
  }

  const videoIds = items.map((item) => item.video_id);
  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("*")
    .in("id", videoIds);

  if (videosError) {
    console.error("[VideoChain] Error fetching videos for chain items:", videosError);
    throw new VideoChainError("Failed to fetch videos for chain items", "database_error");
  }

  const videoMap = new Map(videos?.map((v) => [v.id, v]) ?? []);

  const itemsWithVideos: (VideoChainItem & { video: Video })[] = items.map(
    (item) => {
      const video = videoMap.get(item.video_id);
      if (!video) {
        console.error("[VideoChain] Video not found for chain item:", item.video_id);
        throw new VideoChainError(
          `Video not found for chain item: ${item.video_id}`,
          "not_found"
        );
      }
      return { ...item, video };
    }
  );

  console.log("[VideoChain] Found", itemsWithVideos.length, "items in chain");

  return {
    chain,
    items: itemsWithVideos,
  };
}

/**
 * Append a video to a chain
 * @param chainId - The video chain ID
 * @param videoId - The video ID to append
 * @param parentVideoId - Optional parent video ID for hierarchical chains
 * @returns The created chain item
 */
export async function appendVideoToChain(
  chainId: string,
  videoId: string,
  parentVideoId?: string
): Promise<VideoChainItem> {
  const supabase = await createClient();

  console.log("[VideoChain] Appending video to chain:", {
    chainId,
    videoId,
    parentVideoId,
  });

  const { data: existingItems, error: countError } = await supabase
    .from("video_chain_items")
    .select("order_index", { count: "exact" })
    .eq("chain_id", chainId)
    .order("order_index", { ascending: false })
    .limit(1);

  if (countError) {
    console.error("[VideoChain] Error counting chain items:", countError);
    throw new VideoChainError("Failed to count chain items", "database_error");
  }

  const nextOrderIndex =
    existingItems && existingItems.length > 0
      ? (existingItems[0].order_index ?? 0) + 1
      : 0;

  const itemData: VideoChainItemInsert = {
    chain_id: chainId,
    video_id: videoId,
    order_index: nextOrderIndex,
    parent_video_id: parentVideoId ?? null,
  };

  const { data, error } = await supabase
    .from("video_chain_items")
    .insert(itemData)
    .select()
    .single();

  if (error) {
    console.error("[VideoChain] Error appending video to chain:", error);
    throw new VideoChainError("Failed to append video to chain", "database_error");
  }

  console.log("[VideoChain] Video appended successfully, order_index:", nextOrderIndex);
  return data;
}

/**
 * Remove a video from a chain
 * @param chainId - The video chain ID
 * @param videoId - The video ID to remove
 */
export async function removeVideoFromChain(
  chainId: string,
  videoId: string
): Promise<void> {
  const supabase = await createClient();

  console.log("[VideoChain] Removing video from chain:", { chainId, videoId });

  const { error } = await supabase
    .from("video_chain_items")
    .delete()
    .eq("chain_id", chainId)
    .eq("video_id", videoId);

  if (error) {
    console.error("[VideoChain] Error removing video from chain:", error);
    throw new VideoChainError("Failed to remove video from chain", "database_error");
  }

  console.log("[VideoChain] Video removed from chain successfully");
}

/**
 * Update the order index of a chain item
 * @param chainItemId - The chain item ID
 * @param orderIndex - The new order index
 * @returns The updated chain item
 */
export async function updateChainItemOrder(
  chainItemId: string,
  orderIndex: number
): Promise<VideoChainItem> {
  const supabase = await createClient();

  console.log("[VideoChain] Updating chain item order:", {
    chainItemId,
    orderIndex,
  });

  const { data, error } = await supabase
    .from("video_chain_items")
    .update({ order_index: orderIndex })
    .eq("id", chainItemId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new VideoChainError("Chain item not found", "not_found");
    }
    console.error("[VideoChain] Error updating chain item order:", error);
    throw new VideoChainError("Failed to update chain item order", "database_error");
  }

  console.log("[VideoChain] Chain item order updated successfully");
  return data;
}

/**
 * Delete a video chain and all its items
 * @param chainId - The video chain ID
 */
export async function deleteVideoChain(chainId: string): Promise<void> {
  const supabase = await createClient();

  console.log("[VideoChain] Deleting video chain:", chainId);

  const { error } = await supabase
    .from("video_chains")
    .delete()
    .eq("id", chainId);

  if (error) {
    console.error("[VideoChain] Error deleting video chain:", error);
    throw new VideoChainError("Failed to delete video chain", "database_error");
  }

  console.log("[VideoChain] Video chain deleted successfully");
}

/**
 * Get the chain item that contains a specific video
 * @param videoId - The video ID
 * @returns The chain item or null if video is not in any chain
 */
export async function getVideoChainByVideoId(
  videoId: string
): Promise<VideoChainItem | null> {
  const supabase = await createClient();

  console.log("[VideoChain] Fetching chain item for video:", videoId);

  const { data, error } = await supabase
    .from("video_chain_items")
    .select("*")
    .eq("video_id", videoId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      console.log("[VideoChain] Video not found in any chain:", videoId);
      return null;
    }
    console.error("[VideoChain] Error fetching chain item for video:", error);
    throw new VideoChainError("Failed to fetch chain item for video", "database_error");
  }

  console.log("[VideoChain] Found chain item for video:", data.id);
  return data;
}
