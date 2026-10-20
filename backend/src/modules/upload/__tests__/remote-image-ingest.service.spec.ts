import { BadRequestException } from '@nestjs/common';
import { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
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
} = {}): IncomingMessage {
  const bodyChunks = overrides.bodyChunks ?? [overrides.body ?? JPEG_BUFFER];
  return Object.assign(Readable.from(bodyChunks), {
    statusCode: overrides.status ?? 200,
    headers: overrides.headers ?? {},
  }) as IncomingMessage;
}

describe('RemoteImageIngestService', () => {
  let uploadService: ReturnType<typeof createUploadServiceMock>;
  let service: RemoteImageIngestService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    uploadService = createUploadServiceMock();
    service = new RemoteImageIngestService(uploadService as unknown as UploadService);
    fetchMock = jest.spyOn(service as unknown as {
      requestPinned(url: URL, addresses: string[]): Promise<IncomingMessage>;
    }, 'requestPinned').mockResolvedValue(createFetchResponse());
    jest
      .spyOn(service as unknown as { resolveHostAddresses: (hostname: string) => Promise<string[]> }, 'resolveHostAddresses')
      .mockResolvedValue(['93.184.216.34']);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it.each([
    'http://[::1]/a.jpg',
    'http://[::]/a.jpg',
    'http://[fd00::1]/a.jpg',
    'http://[fe80::1]/a.jpg',
    'http://[::ffff:127.0.0.1]/a.jpg',
    'http://2130706433/a.jpg',
    'http://user:password@cdn.example.com/a.jpg',
  ])('rejects unsafe URL %s without connecting', async (url) => {
    await expect(service.ingest(url)).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { addresses: [] },
    { addresses: ['93.184.216.34', '10.0.0.8'] },
    { addresses: ['fe80::1'] },
    { addresses: ['not-an-ip'] },
  ])(
    'rejects unsafe or empty DNS results $addresses', async ({ addresses }) => {
      jest.spyOn(service as unknown as {
        resolveHostAddresses(hostname: string): Promise<string[]>;
      }, 'resolveHostAddresses').mockResolvedValue(addresses);
      await expect(service.ingest('https://cdn.example.com/a.jpg')).rejects.toThrow(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

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

  it.each<{ status?: number; headers?: Record<string, string> }>([
    { status: 302, headers: { location: 'http://127.0.0.1/a.jpg' } },
    { status: 302 },
    { status: 404 },
    { headers: { 'content-length': String(50 * 1024 * 1024 + 1) } },
  ])('destroys unused response streams for %j', async (options) => {
    const response = createFetchResponse(options);
    const destroy = jest.spyOn(response, 'destroy');
    fetchMock.mockResolvedValue(response);
    await expect(service.ingest('https://cdn.example.com/a.jpg')).rejects.toThrow(BadRequestException);
    expect(destroy).toHaveBeenCalled();
  });

  it('destroys each successful redirect response before continuing', async () => {
    const redirect = createFetchResponse({ status: 302, headers: { location: '/image.jpg' } });
    const destroy = jest.spyOn(redirect, 'destroy');
    fetchMock.mockResolvedValueOnce(redirect).mockImplementationOnce(async () => {
      expect(destroy).toHaveBeenCalled();
      return createFetchResponse();
    });
    await service.ingest('https://cdn.example.com/a.jpg');
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
    const response = createFetchResponse({
      bodyChunks: [Buffer.alloc(50 * 1024 * 1024), Buffer.alloc(1)],
    });
    const destroy = jest.spyOn(response, 'destroy');
    fetchMock.mockResolvedValue(response);

    await expect(service.ingest('https://cdn.example.com/huge.jpg')).rejects.toThrow(BadRequestException);
    expect(destroy).toHaveBeenCalled();
    expect(uploadService.uploadOriginalImageBuffer).not.toHaveBeenCalled();
  });

  it('wraps network failures in BadRequestException', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(service.ingest('https://cdn.example.com/a.jpg')).rejects.toThrow(BadRequestException);
  });
});
