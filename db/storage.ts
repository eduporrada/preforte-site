import { env } from "./env";

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  etag?: string;
  size?: number;
  httpMetadata?: { contentType?: string };
};

type ObjectPutOptions = {
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

export type MediaBucket = {
  put(key: string, value: ArrayBuffer, options?: ObjectPutOptions): Promise<unknown>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
};

export function getMediaBucket(): MediaBucket {
  const bucket = (env as unknown as { MEDIA?: MediaBucket }).MEDIA;
  if (!bucket) {
    throw new Error(
      "R2 binding `MEDIA` indisponivel. Configure o campo `r2` em .openai/hosting.json.",
    );
  }
  return bucket;
}
