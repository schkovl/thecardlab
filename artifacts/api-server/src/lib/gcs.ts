// @google-cloud/storage loaded via dynamic import so the app starts without it
// when GCS_BUCKET_NAME is not configured (e.g. Fly.io dev environment).

const GCS_BUCKET = process.env.GCS_BUCKET_NAME ?? "";
let _storage: unknown | null | undefined;

async function getStorage(): Promise<{
  bucket: (name: string) => {
    file: (path: string) => {
      getSignedUrl: (opts: object) => Promise<[string]>;
    };
  };
} | null> {
  if (!GCS_BUCKET) return null;
  if (_storage === undefined) {
    try {
      // Dynamic import — not bundled, falls back gracefully if package absent
      const { Storage } = await import("@google-cloud/storage" as string);
      _storage = new Storage();
    } catch {
      _storage = null;
    }
  }
  return _storage as Awaited<ReturnType<typeof getStorage>>;
}

export async function generateUploadUrl(
  objectPath: string,
  mimeType: string,
): Promise<string | null> {
  const gcs = await getStorage();
  if (!gcs) return null;
  try {
    const [url] = await gcs.bucket(GCS_BUCKET).file(objectPath).getSignedUrl({
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: mimeType,
      version: "v4",
    });
    return url;
  } catch {
    return null;
  }
}

export async function generateReadUrl(objectPath: string): Promise<string | null> {
  const gcs = await getStorage();
  if (!gcs) return null;
  try {
    const [url] = await gcs.bucket(GCS_BUCKET).file(objectPath).getSignedUrl({
      action: "read",
      expires: Date.now() + 10 * 60 * 1000,
      version: "v4",
    });
    return url;
  } catch {
    return null;
  }
}

export function isGCSConfigured(): boolean {
  return !!GCS_BUCKET;
}
