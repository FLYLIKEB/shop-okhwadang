import dns from 'node:dns';
import * as net from 'node:net';
import tls from 'node:tls';
import { BadRequestException } from '@nestjs/common';
import { createServer, Server } from 'node:http';
import { RemoteImageIngestService } from '../remote-image-ingest.service';
import { UploadService } from '../upload.service';

type ConnectionLookup = (
  hostname: string,
  options: dns.LookupOptions,
  callback: (error: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
) => void;

describe('remote image connection DNS pinning', () => {
  let server: Server;
  let port: number;
  let destinations: string[];
  let hosts: string[];
  let service: RemoteImageIngestService;
  let resolveHost: jest.SpyInstance;

  beforeEach(async () => {
    destinations = [];
    hosts = [];
    server = createServer((request, response) => {
      hosts.push(request.headers.host ?? '');
      if (request.url === '/stall-headers') return;
      if (request.url === '/stall-body') {
        response.writeHead(200);
        response.flushHeaders();
        return;
      }
      if (request.url === '/redirect') {
        response.writeHead(302, { location: `http://second.example:${port}/image.jpg` });
      }
      response.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as net.AddressInfo).port;
    service = new RemoteImageIngestService({
      uploadOriginalImageBuffer: jest.fn().mockResolvedValue({ url: 'stored' }),
    } as unknown as UploadService);
    resolveHost = jest.spyOn(
      service as unknown as { resolveHostAddresses(host: string): Promise<string[]> },
      'resolveHostAddresses',
    ).mockResolvedValue(['93.184.216.34']);

    const reboundLookup: ConnectionLookup = (_hostname, options, callback) => {
      if (options.all) callback(null, [{ address: '127.0.0.1', family: 4 }]);
      else callback(null, '127.0.0.1', 4);
    };
    jest.spyOn(dns, 'lookup').mockImplementation(reboundLookup as typeof dns.lookup);
    const originalConnect = net.Socket.prototype.connect;
    jest.spyOn(net.Socket.prototype, 'connect').mockImplementation(function (this: net.Socket, ...args: unknown[]) {
      const normalized = (Array.isArray(args[0]) ? args[0] : args) as [net.TcpNetConnectOpts, ...unknown[]];
      const options = normalized[0];
      const connectionLookup = (options.lookup ?? dns.lookup) as ConnectionLookup;
      const fixtureLookup: ConnectionLookup = (hostname, lookupOptions, callback) => {
        connectionLookup(hostname, lookupOptions, (error, address, family) => {
          destinations.push(...(Array.isArray(address) ? address.map((entry) => entry.address) : [address]));
          if (lookupOptions.all) callback(error, [{ address: '127.0.0.1', family: 4 }]);
          else callback(error, '127.0.0.1', family);
        });
      };
      options.lookup = fixtureLookup as typeof dns.lookup;
      return Reflect.apply(originalConnect, this, args);
    });
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    jest.restoreAllMocks();
  });

  it('connects only to the validated public address despite a private second DNS answer', async () => {
    await expect(service.ingest(`http://first.example:${port}/image.jpg`)).resolves.toEqual({ url: 'stored' });
    expect(destinations).toEqual(['93.184.216.34']);
    expect(hosts).toEqual([`first.example:${port}`]);
    expect(dns.lookup).not.toHaveBeenCalled();
  });

  it('pins a freshly validated destination for every redirect hop', async () => {
    resolveHost.mockResolvedValueOnce(['93.184.216.34']).mockResolvedValueOnce(['1.1.1.1']);
    await service.ingest(`http://first.example:${port}/redirect`);
    expect(destinations).toEqual(['93.184.216.34', '1.1.1.1']);
    expect(hosts).toEqual([`first.example:${port}`, `second.example:${port}`]);
    expect(dns.lookup).not.toHaveBeenCalled();
  });

  it('does not connect to a redirect whose DNS becomes private', async () => {
    resolveHost.mockResolvedValueOnce(['93.184.216.34']).mockResolvedValueOnce(['10.0.0.8']);
    await expect(service.ingest(`http://first.example:${port}/redirect`)).rejects.toThrow(BadRequestException);
    expect(destinations).toEqual(['93.184.216.34']);
    expect(hosts).toEqual([`first.example:${port}`]);
  });

  it('connects to a validated public IPv6 destination', async () => {
    resolveHost.mockResolvedValue(['2606:4700:4700::1111']);
    await expect(service.ingest(`http://first.example:${port}/image.jpg`)).resolves.toEqual({ url: 'stored' });
    expect(destinations).toEqual(['2606:4700:4700::1111']);
  });

  it('retains validated IPv6 and IPv4 candidates for dual-stack fallback', async () => {
    resolveHost.mockResolvedValue(['2606:4700:4700::1111', '93.184.216.34']);
    await expect(service.ingest(`http://first.example:${port}/image.jpg`)).resolves.toEqual({ url: 'stored' });
    expect(destinations).toEqual(['2606:4700:4700::1111', '93.184.216.34']);
    expect(dns.lookup).not.toHaveBeenCalled();
  });

  it.each(['/stall-headers', '/stall-body'])('aborts stalled downloads at %s', async (path) => {
    const signal = AbortSignal.timeout(100);
    const timeout = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);
    await expect(service.ingest(`http://first.example:${port}${path}`)).rejects.toThrow(BadRequestException);
    expect(timeout).toHaveBeenCalledWith(10_000);
  });

  it('keeps the original TLS hostname/SNI and rejects a non-TLS peer', async () => {
    const connect = jest.spyOn(tls, 'connect');
    await expect(service.ingest(`https://first.example:${port}/image.jpg`)).rejects.toThrow(BadRequestException);
    expect(destinations).toEqual(['93.184.216.34']);
    expect(connect.mock.calls[0][0]).toEqual(expect.objectContaining({
      host: 'first.example',
      servername: 'first.example',
    }));
    expect(connect.mock.calls[0][0]).not.toHaveProperty('rejectUnauthorized', false);
    expect(connect.mock.calls[0][0]).not.toHaveProperty('checkServerIdentity');
  });
});
