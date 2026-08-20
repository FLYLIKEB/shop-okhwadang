import { RemoteImageIngestService } from './remote-image-ingest.service';
import { UploadedFile } from './interfaces/storage.interface';

/**
 * Per-operation cache for remote image ingestion.
 *
 * A cache instance is intentionally short-lived: create one for a single import
 * operation/batch so stale in-flight promises are not shared across batches.
 */
export class RemoteImageIngestCache {
  private readonly promisesByNormalizedUrl = new Map<string, Promise<UploadedFile>>();

  constructor(private readonly remoteImageIngestService: RemoteImageIngestService) {}

  ingest(url: string): Promise<UploadedFile> {
    const key = normalizeRemoteImageCacheKey(url);
    const cached = this.promisesByNormalizedUrl.get(key);
    if (cached) return cached;

    const promise = this.remoteImageIngestService.ingest(url).catch((err: unknown) => {
      if (this.promisesByNormalizedUrl.get(key) === promise) {
        this.promisesByNormalizedUrl.delete(key);
      }
      throw err;
    });
    this.promisesByNormalizedUrl.set(key, promise);
    return promise;
  }
}

export function normalizeRemoteImageCacheKey(url: string): string {
  const trimmed = url.trim();
  try {
    return new URL(trimmed).href;
  } catch {
    return trimmed;
  }
}
