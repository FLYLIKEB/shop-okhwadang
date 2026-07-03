import { BadRequestException } from '@nestjs/common';
import { RemoteImageIngestService } from '../remote-image-ingest.service';
import { UploadService } from '../upload.service';

const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

function createUploadServiceMock() {
  return {
    uploadOriginalImageBuffer: jest.fn().mockResolvedValue({
      url: 'https://cdn.example.com/uploads/uuid.jpg',
      filename: 'uuid.jpg',
    }),
    uploadImageBuffer: jest.fn().mockResolvedValue({
      url: 'https://cdn.example.com/uploads/resized.jpg',
      filename: 'resized.jpg',
    }),
  };
}

function createFetchResponse(overrides: {
  status?: number;
  headers?: Record<string, string>;
  body?: Buffer;
  bodyChunks?: Buffer[];
} = {}): Response {
  const bodyChunks = overrides.bodyChunks ?? [overrides.body ?? JPEG_BUFFER];
  return {
    status: overrides.status ?? 200,
    ok: (overrides.status ?? 200) >= 200 && (overrides.status ?? 200) < 300,
    headers: new Headers(overrides.headers ?? {}),
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of bodyChunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
  } as unknown as Response;
}

describe('RemoteImageIngestService', () => {
  let uploadService: ReturnType<typeof createUploadServiceMock>;
  let service: RemoteImageIngestService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    uploadService = createUploadServiceMock();
    service = new RemoteImageIngestService(uploadService as unknown as UploadService);
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(createFetchResponse());
    jest
      .spyOn(service as unknown as { resolveHostAddresses: (hostname: string) => Promise<string[]> }, 'resolveHostAddresses')
      .mockResolvedValue(['93.184.216.34']);
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('downloads a remote image and uploads the original buffer without reprocessing', async () => {
    const result = await service.ingest('https://shop1.phinf.naver.net/some/path/image.jpg');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(uploadService.uploadOriginalImageBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('image.jpg'),
    );
    expect(result.url).toBe('https://cdn.example.com/uploads/uuid.jpg');
  });

  it('rejects non-http(s) URLs', async () => {
    await expect(service.ingest('ftp://example.com/a.jpg')).rejects.toThrow(BadRequestException);
    await expect(service.ingest('file:///etc/passwd')).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed URLs', async () => {
    await expect(service.ingest('not-a-url')).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects localhost and private IP hosts', async () => {
    await expect(service.ingest('http://localhost/a.jpg')).rejects.toThrow(BadRequestException);
    await expect(service.ingest('http://127.0.0.1/a.jpg')).rejects.toThrow(BadRequestException);
    await expect(service.ingest('http://10.0.0.5/a.jpg')).rejects.toThrow(BadRequestException);
    await expect(service.ingest('http://172.16.0.1/a.jpg')).rejects.toThrow(BadRequestException);
    await expect(service.ingest('http://192.168.0.10/a.jpg')).rejects.toThrow(BadRequestException);
    await expect(service.ingest('http://169.254.169.254/meta.jpg')).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects hostnames that resolve to private addresses', async () => {
    jest
      .spyOn(service as unknown as { resolveHostAddresses: (hostname: string) => Promise<string[]> }, 'resolveHostAddresses')
      .mockResolvedValue(['10.0.0.8']);

    await expect(service.ingest('https://internal.example.com/a.jpg')).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('follows redirects while re-validating each hop', async () => {
    fetchMock
      .mockResolvedValueOnce(createFetchResponse({
        status: 302,
        headers: { location: 'https://cdn2.example.com/moved.jpg' },
      }))
      .mockResolvedValueOnce(createFetchResponse());

    await service.ingest('https://cdn.example.com/a.jpg');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://cdn2.example.com/moved.jpg');
  });

  it('rejects redirects to private addresses', async () => {
    fetchMock.mockResolvedValueOnce(createFetchResponse({
      status: 302,
      headers: { location: 'http://169.254.169.254/latest/meta-data' },
    }));

    await expect(service.ingest('https://cdn.example.com/a.jpg')).rejects.toThrow(BadRequestException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects when redirect chain is too long', async () => {
    fetchMock.mockResolvedValue(createFetchResponse({
      status: 302,
      headers: { location: 'https://cdn.example.com/loop.jpg' },
    }));

    await expect(service.ingest('https://cdn.example.com/a.jpg')).rejects.toThrow(BadRequestException);
  });

  it('rejects non-success HTTP responses', async () => {
    fetchMock.mockResolvedValue(createFetchResponse({ status: 404 }));

    await expect(service.ingest('https://cdn.example.com/missing.jpg')).rejects.toThrow(BadRequestException);
  });

  it('preserves original downloads at the 20MB size threshold', async () => {
    fetchMock.mockResolvedValue(createFetchResponse({
      headers: { 'content-length': String(20 * 1024 * 1024) },
      bodyChunks: [JPEG_BUFFER, Buffer.alloc(20 * 1024 * 1024 - JPEG_BUFFER.length, 1)],
    }));

    await service.ingest('https://cdn.example.com/large.jpg');

    expect(uploadService.uploadOriginalImageBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ length: 20 * 1024 * 1024 }),
      expect.stringContaining('large.jpg'),
    );
  });

  it('resizes downloads that exceed the 20MB threshold', async () => {
    fetchMock.mockResolvedValue(createFetchResponse({
      headers: { 'content-length': String(20 * 1024 * 1024 + 1) },
      bodyChunks: [JPEG_BUFFER, Buffer.alloc(20 * 1024 * 1024 + 1 - JPEG_BUFFER.length, 1)],
    }));

    const result = await service.ingest('https://cdn.example.com/large.jpg');

    expect(uploadService.uploadOriginalImageBuffer).not.toHaveBeenCalled();
    expect(uploadService.uploadImageBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ length: 20 * 1024 * 1024 + 1 }),
      expect.stringContaining('large.jpg'),
    );
    expect(result.url).toBe('https://cdn.example.com/uploads/resized.jpg');
  });

  it('rejects downloads exceeding the absolute input limit via content-length', async () => {
    fetchMock.mockResolvedValue(createFetchResponse({
      headers: { 'content-length': String(50 * 1024 * 1024 + 1) },
    }));

    await expect(service.ingest('https://cdn.example.com/huge.jpg')).rejects.toThrow(BadRequestException);
    expect(uploadService.uploadOriginalImageBuffer).not.toHaveBeenCalled();
    expect(uploadService.uploadImageBuffer).not.toHaveBeenCalled();
  });

  it('rejects downloads whose body exceeds the absolute input limit', async () => {
    fetchMock.mockResolvedValue(createFetchResponse({
      bodyChunks: [JPEG_BUFFER, Buffer.alloc(50 * 1024 * 1024 + 1 - JPEG_BUFFER.length, 1)],
    }));

    await expect(service.ingest('https://cdn.example.com/huge.jpg')).rejects.toThrow(BadRequestException);
    expect(uploadService.uploadOriginalImageBuffer).not.toHaveBeenCalled();
    expect(uploadService.uploadImageBuffer).not.toHaveBeenCalled();
  });

  it('stops reading as soon as streamed response exceeds the absolute input limit', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({ done: false, value: Buffer.alloc(50 * 1024 * 1024) })
            .mockResolvedValueOnce({ done: false, value: Buffer.alloc(1) }),
          cancel,
          releaseLock: jest.fn(),
        }),
      },
    } as unknown as Response);

    await expect(service.ingest('https://cdn.example.com/huge.jpg')).rejects.toThrow(BadRequestException);
    expect(cancel).toHaveBeenCalled();
    expect(uploadService.uploadOriginalImageBuffer).not.toHaveBeenCalled();
  });

  it('wraps network failures in BadRequestException', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(service.ingest('https://cdn.example.com/a.jpg')).rejects.toThrow(BadRequestException);
  });
});
