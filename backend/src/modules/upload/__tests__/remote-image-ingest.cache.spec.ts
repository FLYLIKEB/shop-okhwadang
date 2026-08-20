import { BadRequestException } from '@nestjs/common';
import { RemoteImageIngestCache, normalizeRemoteImageCacheKey } from '../remote-image-ingest.cache';
import { RemoteImageIngestService } from '../remote-image-ingest.service';

describe('RemoteImageIngestCache', () => {
  function createIngestService() {
    return {
      ingest: jest.fn(async (url: string) => ({
        url: `https://cdn.example.com/${encodeURIComponent(url)}`,
        filename: 'remote.jpg',
      })),
    };
  }

  it('uses a normalized URL key to suppress duplicate in-flight ingests', async () => {
    const ingestService = createIngestService();
    const cache = new RemoteImageIngestCache(ingestService as unknown as RemoteImageIngestService);

    const [first, second] = await Promise.all([
      cache.ingest('https://img.example.com:443/path/photo.jpg'),
      cache.ingest(' https://img.example.com/path/photo.jpg '),
    ]);

    expect(first).toBe(second);
    expect(ingestService.ingest).toHaveBeenCalledTimes(1);
    expect(ingestService.ingest).toHaveBeenCalledWith('https://img.example.com:443/path/photo.jpg');
  });

  it('evicts rejected promises so a later retry can ingest again', async () => {
    const ingestService = createIngestService();
    ingestService.ingest
      .mockRejectedValueOnce(new BadRequestException('download failed'))
      .mockResolvedValueOnce({ url: 'https://cdn.example.com/retry.jpg', filename: 'retry.jpg' });
    const cache = new RemoteImageIngestCache(ingestService as unknown as RemoteImageIngestService);

    await expect(cache.ingest('https://img.example.com/retry.jpg')).rejects.toThrow(BadRequestException);
    await expect(cache.ingest('https://img.example.com/retry.jpg')).resolves.toEqual({
      url: 'https://cdn.example.com/retry.jpg',
      filename: 'retry.jpg',
    });

    expect(ingestService.ingest).toHaveBeenCalledTimes(2);
  });

  it('keeps cache instances isolated per operation', async () => {
    const ingestService = createIngestService();
    const firstBatch = new RemoteImageIngestCache(ingestService as unknown as RemoteImageIngestService);
    const secondBatch = new RemoteImageIngestCache(ingestService as unknown as RemoteImageIngestService);

    await firstBatch.ingest('https://img.example.com/shared.jpg');
    await secondBatch.ingest('https://img.example.com/shared.jpg');

    expect(ingestService.ingest).toHaveBeenCalledTimes(2);
  });

  it('normalizes default ports and trims whitespace for cache keys', () => {
    expect(normalizeRemoteImageCacheKey(' https://img.example.com:443/a.jpg ')).toBe('https://img.example.com/a.jpg');
    expect(normalizeRemoteImageCacheKey('http://img.example.com:80/a.jpg')).toBe('http://img.example.com/a.jpg');
  });
});
