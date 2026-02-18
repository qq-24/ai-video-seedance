import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export type StorageBucket = "images" | "videos" | "materials";

function getBucketPath(bucket: StorageBucket): string {
  return path.join(UPLOAD_DIR, bucket);
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function initStorage(): void {
  ensureDir(UPLOAD_DIR);
  ensureDir(getBucketPath("images"));
  ensureDir(getBucketPath("videos"));
  ensureDir(getBucketPath("materials"));
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
}

export async function uploadFile(
  bucket: StorageBucket,
  filename: string,
  buffer: Buffer
): Promise<UploadResult> {
  initStorage();
  
  const bucketPath = getBucketPath(bucket);
  const timestamp = Date.now();
  const uniqueFilename = `${timestamp}-${filename}`;
  const filePath = path.join(bucketPath, uniqueFilename);
  
  fs.writeFileSync(filePath, buffer);
  
  const url = `/uploads/${bucket}/${uniqueFilename}`;
  const storagePath = `uploads/${bucket}/${uniqueFilename}`;
  
  return {
    path: storagePath,
    url,
    size: buffer.length,
  };
}

export async function deleteFile(bucket: StorageBucket, filename: string): Promise<boolean> {
  const filePath = path.join(getBucketPath(bucket), filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  
  return false;
}

export async function deleteByPath(storagePath: string): Promise<boolean> {
  const filePath = path.join(process.cwd(), "public", storagePath);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  
  return false;
}

export function getPublicUrl(storagePath: string): string {
  return `/${storagePath}`;
}

export function listFiles(bucket: StorageBucket): string[] {
  const bucketPath = getBucketPath(bucket);
  
  if (!fs.existsSync(bucketPath)) {
    return [];
  }
  
  return fs.readdirSync(bucketPath);
}
