import { prisma } from "./client";
import type { Material } from "@prisma/client";

export class MaterialError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "database_error"
  ) {
    super(message);
    this.name = "MaterialError";
  }
}

export async function createMaterial(data: {
  sceneId: string;
  type: string;
  storagePath: string;
  url: string;
  metadata?: string;
  orderIndex?: number;
}): Promise<Material> {
  return prisma.material.create({
    data: {
      sceneId: data.sceneId,
      type: data.type,
      storagePath: data.storagePath,
      url: data.url,
      metadata: data.metadata ?? null,
      orderIndex: data.orderIndex ?? 0,
    },
  });
}

export async function getMaterialsBySceneId(sceneId: string): Promise<Material[]> {
  return prisma.material.findMany({
    where: { sceneId },
    orderBy: { orderIndex: "asc" },
  });
}

export async function getMaterialById(materialId: string): Promise<Material | null> {
  return prisma.material.findUnique({
    where: { id: materialId },
  });
}

export async function updateMaterial(
  materialId: string,
  updates: { metadata?: string; orderIndex?: number; sceneId?: string }
): Promise<Material> {
  return prisma.material.update({
    where: { id: materialId },
    data: updates,
  });
}

export async function deleteMaterial(materialId: string): Promise<void> {
  await prisma.material.delete({
    where: { id: materialId },
  });
}

export async function updateMaterialOrder(materialId: string, orderIndex: number): Promise<Material> {
  return prisma.material.update({
    where: { id: materialId },
    data: { orderIndex },
  });
}

export async function createMaterials(materials: Array<{
  sceneId: string;
  type: string;
  storagePath: string;
  url: string;
  metadata?: string;
  orderIndex?: number;
}>): Promise<Material[]> {
  return prisma.material.createManyAndReturn({
    data: materials.map((m) => ({
      sceneId: m.sceneId,
      type: m.type,
      storagePath: m.storagePath,
      url: m.url,
      metadata: m.metadata ?? null,
      orderIndex: m.orderIndex ?? 0,
    })),
  });
}

export async function deleteMaterialsBySceneId(sceneId: string): Promise<void> {
  await prisma.material.deleteMany({
    where: { sceneId },
  });
}

export async function getLatestMaterialBySceneId(
  sceneId: string,
  type?: string
): Promise<Material | null> {
  const where: any = { sceneId };
  if (type) {
    where.type = type;
  }
  return prisma.material.findFirst({
    where,
    orderBy: { orderIndex: "desc" },
  });
}
