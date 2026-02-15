/**
 * Material data access layer.
 * Handles CRUD operations for scene materials (audio, video, image, text).
 */

import { createClient } from "@/lib/supabase/server";
import type {
  Material,
  MaterialInsert,
  MaterialUpdate,
} from "@/types/database";

/**
 * Custom error class for material operations
 */
export class MaterialError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "unauthorized" | "database_error"
  ) {
    super(message);
    this.name = "MaterialError";
  }
}

/**
 * Create a material record
 * @param material - The material data to insert
 * @returns The created material
 */
export async function createMaterial(material: MaterialInsert): Promise<Material> {
  const supabase = await createClient();

  console.log("[createMaterial] Creating material for scene:", material.scene_id);

  const { data, error } = await supabase
    .from("materials")
    .insert(material)
    .select()
    .single();

  if (error) {
    console.error("[createMaterial] Error creating material:", error);
    throw new MaterialError("Failed to create material", "database_error");
  }

  console.log("[createMaterial] Material created successfully:", data.id);
  return data;
}

/**
 * Get all materials for a scene
 * @param sceneId - The scene ID
 * @returns Array of materials ordered by order_index
 */
export async function getMaterialsBySceneId(sceneId: string): Promise<Material[]> {
  const supabase = await createClient();

  console.log("[getMaterialsBySceneId] Fetching materials for scene:", sceneId);

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("scene_id", sceneId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("[getMaterialsBySceneId] Error fetching materials:", error);
    throw new MaterialError("Failed to fetch materials", "database_error");
  }

  console.log("[getMaterialsBySceneId] Found", data?.length ?? 0, "materials");
  return data ?? [];
}

/**
 * Get a single material by ID
 * @param materialId - The material ID
 * @returns The material or null if not found
 */
export async function getMaterialById(materialId: string): Promise<Material | null> {
  const supabase = await createClient();

  console.log("[getMaterialById] Fetching material:", materialId);

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("id", materialId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      console.log("[getMaterialById] Material not found:", materialId);
      return null;
    }
    console.error("[getMaterialById] Error fetching material:", error);
    throw new MaterialError("Failed to fetch material", "database_error");
  }

  return data;
}

/**
 * Update a material
 * @param materialId - The material ID
 * @param updates - The fields to update
 * @returns The updated material
 */
export async function updateMaterial(
  materialId: string,
  updates: MaterialUpdate
): Promise<Material> {
  const supabase = await createClient();

  console.log("[updateMaterial] Updating material:", materialId, "with updates:", Object.keys(updates));

  const { data, error } = await supabase
    .from("materials")
    .update(updates)
    .eq("id", materialId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new MaterialError("Material not found", "not_found");
    }
    console.error("[updateMaterial] Error updating material:", error);
    throw new MaterialError("Failed to update material", "database_error");
  }

  console.log("[updateMaterial] Material updated successfully:", materialId);
  return data;
}

/**
 * Delete a material
 * @param materialId - The material ID
 */
export async function deleteMaterial(materialId: string): Promise<void> {
  const supabase = await createClient();

  console.log("[deleteMaterial] Deleting material:", materialId);

  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId);

  if (error) {
    console.error("[deleteMaterial] Error deleting material:", error);
    throw new MaterialError("Failed to delete material", "database_error");
  }

  console.log("[deleteMaterial] Material deleted successfully:", materialId);
}

/**
 * Update a material's order index
 * @param materialId - The material ID
 * @param orderIndex - The new order index
 * @returns The updated material
 */
export async function updateMaterialOrder(
  materialId: string,
  orderIndex: number
): Promise<Material> {
  const supabase = await createClient();

  console.log("[updateMaterialOrder] Updating order for material:", materialId, "to:", orderIndex);

  const { data, error } = await supabase
    .from("materials")
    .update({ order_index: orderIndex })
    .eq("id", materialId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new MaterialError("Material not found", "not_found");
    }
    console.error("[updateMaterialOrder] Error updating material order:", error);
    throw new MaterialError("Failed to update material order", "database_error");
  }

  console.log("[updateMaterialOrder] Material order updated successfully");
  return data;
}

/**
 * Create multiple materials in batch
 * @param materials - Array of material data to insert
 * @returns Array of created materials
 */
export async function createMaterials(materials: MaterialInsert[]): Promise<Material[]> {
  const supabase = await createClient();

  console.log("[createMaterials] Creating", materials.length, "materials");

  if (materials.length === 0) {
    console.log("[createMaterials] No materials to create, returning empty array");
    return [];
  }

  const { data, error } = await supabase
    .from("materials")
    .insert(materials)
    .select();

  if (error) {
    console.error("[createMaterials] Error creating materials:", error);
    throw new MaterialError("Failed to create materials", "database_error");
  }

  console.log("[createMaterials] Created", data?.length ?? 0, "materials successfully");
  return data ?? [];
}

/**
 * Delete all materials for a scene
 * @param sceneId - The scene ID
 */
export async function deleteMaterialsBySceneId(sceneId: string): Promise<void> {
  const supabase = await createClient();

  console.log("[deleteMaterialsBySceneId] Deleting all materials for scene:", sceneId);

  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("scene_id", sceneId);

  if (error) {
    console.error("[deleteMaterialsBySceneId] Error deleting materials:", error);
    throw new MaterialError("Failed to delete materials", "database_error");
  }

  console.log("[deleteMaterialsBySceneId] Materials deleted successfully for scene:", sceneId);
}
