import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger.js";

const BUCKET = process.env.BUCKET_NAME ?? "";
const ENDPOINT = process.env.AWS_ENDPOINT_URL_S3 ?? "https://fly.storage.tigris.dev";
const REGION = process.env.AWS_REGION ?? "auto";

let _client: S3Client | null | undefined;

function getClient(): S3Client | null {
  if (!BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) return null;
  if (_client === undefined) {
    _client = new S3Client({
      endpoint: ENDPOINT,
      region: REGION,
      forcePathStyle: false,
    });
  }
  return _client;
}

export function isStorageConfigured(): boolean {
  return !!BUCKET && !!process.env.AWS_ACCESS_KEY_ID;
}

export async function generateUploadUrl(objectPath: string, mimeType: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    return await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: BUCKET, Key: objectPath, ContentType: mimeType }),
      { expiresIn: 900 },
    );
  } catch (e) {
    logger.warn({ e }, "storage: generateUploadUrl failed");
    return null;
  }
}

export async function generateReadUrl(objectPath: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: BUCKET, Key: objectPath }),
      { expiresIn: 600 },
    );
  } catch (e) {
    logger.warn({ e }, "storage: generateReadUrl failed");
    return null;
  }
}
