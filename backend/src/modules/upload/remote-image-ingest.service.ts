import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { IncomingMessage, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import * as path from 'node:path';
import { UploadService } from './upload.service';
import { CmsMediaKind } from './cms-media.constants';
import type { CmsMedia } from './upload.service';
import { UploadedFile } from './interfaces/storage.interface';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_INPUT_FILE_SIZE_BYTES,
  MAX_UPLOAD_INPUT_FILE_SIZE_LABEL,
} from './upload.constants';

const MAX_REDIRECTS = 3;
const DOWNLOAD_TIMEOUT_MS = 10_000;

@Injectable()
export class RemoteImageIngestService {
  constructor(private readonly uploadService: UploadService) {}

  async ingest(url: string): Promise<UploadedFile> {
    const { buffer, finalUrl } = await this.download(url);
    const filename = this.filenameFromUrl(finalUrl);

    if (buffer.length > MAX_UPLOAD_FILE_SIZE_BYTES) {
      return this.uploadService.uploadImageBuffer(buffer, filename);
    }

    return this.uploadService.uploadOriginalImageBuffer(buffer, filename);
  }

  async ingestCms(url: string, kind: CmsMediaKind): Promise<CmsMedia> {
    const { buffer, finalUrl } = await this.download(url);
    return this.uploadService.uploadCmsImageBuffer(
      buffer,
      this.filenameFromUrl(finalUrl),
      kind,
    );
  }

  private async download(rawUrl: string): Promise<{ buffer: Buffer; finalUrl: URL }> {
    let current = this.parseUrl(rawUrl);

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const addresses = await this.assertSafeUrl(current);

      let response: IncomingMessage;
      try {
        response = await this.requestPinned(current, addresses);
      } catch {
        throw new BadRequestException(`이미지 URL에 접근할 수 없습니다: ${current.href}`);
      }

      try {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          const location = response.headers.location;
          if (!location) {
            throw new BadRequestException(`이미지 리다이렉트 응답에 location 헤더가 없습니다: ${current.href}`);
          }
          current = new URL(location, current);
          continue;
        }

        if (status < 200 || status >= 300) {
          throw new BadRequestException(`이미지 다운로드에 실패했습니다. (HTTP ${status}): ${current.href}`);
        }

        const contentLength = Number(response.headers['content-length'] ?? 0);
        if (contentLength > MAX_UPLOAD_INPUT_FILE_SIZE_BYTES) {
          throw new BadRequestException(
            `이미지 크기가 ${MAX_UPLOAD_INPUT_FILE_SIZE_LABEL}를 초과합니다: ${current.href}`,
          );
        }

        return { buffer: await this.readLimitedBody(response, current), finalUrl: current };
      } finally {
        response.destroy();
      }
    }

    throw new BadRequestException(`이미지 리다이렉트 횟수가 너무 많습니다: ${rawUrl}`);
  }

  private requestPinned(url: URL, addresses: string[]): Promise<IncomingMessage> {
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const destinations = addresses.map((address) => ({ address, family: isIP(address) }));
    return new Promise((resolve, reject) => {
      const outgoing = request(url, {
        agent: false,
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, destinations);
          else callback(null, destinations[0].address, destinations[0].family);
        },
      }, resolve);
      outgoing.on('error', reject);
      outgoing.end();
    });
  }

  private parseUrl(rawUrl: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException(`올바르지 않은 이미지 URL입니다: ${rawUrl}`);
    }
    return parsed;
  }

  private async assertSafeUrl(url: URL): Promise<string[]> {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BadRequestException(`http/https 이미지 URL만 지원합니다: ${url.href}`);
    }

    if (url.username || url.password) {
      throw new BadRequestException('이미지 URL에 인증 정보를 포함할 수 없습니다.');
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (hostname.toLowerCase() === 'localhost' || hostname.toLowerCase().endsWith('.localhost')) {
      throw new BadRequestException(`허용되지 않는 이미지 호스트입니다: ${url.hostname}`);
    }

    const addresses = isIP(hostname) ? [hostname] : await this.resolveHostAddresses(hostname);
    if (addresses.length === 0 || addresses.some((address) => isPrivateAddress(address))) {
      throw new BadRequestException(`허용되지 않는 이미지 호스트입니다: ${url.hostname}`);
    }
    return addresses;
  }

  private async resolveHostAddresses(hostname: string): Promise<string[]> {
    try {
      const results = await lookup(hostname, { all: true, verbatim: true });
      return results.map((result) => result.address);
    } catch {
      throw new BadRequestException(`이미지 호스트를 확인할 수 없습니다: ${hostname}`);
    }
  }

  private async readLimitedBody(response: IncomingMessage, url: URL): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    try {
      for await (const chunk of response) {
        totalBytes += chunk.length;
        if (totalBytes > MAX_UPLOAD_INPUT_FILE_SIZE_BYTES) {
          throw new BadRequestException(
            `이미지 크기가 ${MAX_UPLOAD_INPUT_FILE_SIZE_LABEL}를 초과합니다: ${url.href}`,
          );
        }
        chunks.push(chunk);
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`이미지 URL에 접근할 수 없습니다: ${url.href}`);
    }

    return Buffer.concat(chunks, totalBytes);
  }

  private filenameFromUrl(url: URL): string {
    const basename = path.basename(url.pathname);
    return basename && basename !== '/' ? basename : 'remote-image';
  }
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

function isPrivateIpv4(address: string): boolean {
  const [a, b] = address.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.slice('::ffff:'.length);
    return isIP(mapped) === 4 ? isPrivateIpv4(mapped) : true;
  }
  return (
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  );
}
