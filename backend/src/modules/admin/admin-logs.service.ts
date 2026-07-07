import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AdminLogType } from './dto/admin-log-query.dto';

const DEFAULT_APP_NAME = 'commerce';
const DEFAULT_LINES = 500;
const MAX_READ_BYTES = 2 * 1024 * 1024;

export interface AdminLogFilter {
  search?: string;
  startAt?: string;
  endAt?: string;
}

export interface AdminLogResponse {
  type: AdminLogType;
  app: string;
  lines: number;
  content: string;
  lineCount: number;
  updatedAt: string | null;
  source: string;
  truncated: boolean;
}

@Injectable()
export class AdminLogsService {
  private readonly logger = new Logger(AdminLogsService.name);

  async getLogs(
    type: AdminLogType = 'normal',
    lines = DEFAULT_LINES,
    filter: AdminLogFilter = {},
  ): Promise<AdminLogResponse> {
    const normalizedLines = this.normalizeLines(lines);
    const app = process.env.ADMIN_LOG_PM2_APP_NAME || process.env.PM2_APP_NAME || DEFAULT_APP_NAME;
    const logFile = this.getLogFilePath(app, type);

    try {
      const { content, lineCount, truncated, updatedAt } = await this.readRecentLines(
        logFile,
        normalizedLines,
        filter,
      );
      return {
        type,
        app,
        lines: normalizedLines,
        content,
        lineCount,
        updatedAt,
        source: `pm2:${app}:${type === 'error' ? 'error' : 'out'}`,
        truncated,
      };
    } catch (err) {
      this.logger.warn(`관리자 로그 조회 실패: ${this.describeReadError(err)}`);
      throw new ServiceUnavailableException('원격 로그 파일을 조회할 수 없습니다.');
    }
  }

  private getLogFilePath(app: string, type: AdminLogType): string {
    const logDir =
      process.env.ADMIN_LOG_PM2_LOG_DIR ||
      process.env.PM2_LOG_DIR ||
      path.join(os.homedir(), '.pm2', 'logs');
    const suffix = type === 'error' ? 'error' : 'out';
    return path.join(logDir, `${app}-${suffix}.log`);
  }

  private normalizeLines(lines: number): number {
    if (!Number.isFinite(lines)) {
      return DEFAULT_LINES;
    }
    return Math.min(5000, Math.max(10, Math.trunc(lines)));
  }

  private async readRecentLines(
    filePath: string,
    lines: number,
    filter: AdminLogFilter,
  ): Promise<{
    content: string;
    lineCount: number;
    updatedAt: string | null;
    truncated: boolean;
  }> {
    const stat = await fs.stat(filePath);
    const readBytes = Math.min(stat.size, MAX_READ_BYTES);
    const buffer = Buffer.alloc(readBytes);
    const handle = await fs.open(filePath, 'r');

    try {
      await handle.read(buffer, 0, readBytes, stat.size - readBytes);
    } finally {
      await handle.close();
    }

    const allLines = buffer
      .toString('utf8')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/);
    if (allLines.length > 0 && allLines[allLines.length - 1] === '') {
      allLines.pop();
    }
    const filteredLines = this.filterLines(allLines, filter);
    const selectedLines = filteredLines.slice(-lines);

    return {
      content: selectedLines.join('\n'),
      lineCount: selectedLines.length,
      updatedAt: Number.isFinite(stat.mtimeMs) ? stat.mtime.toISOString() : null,
      truncated: stat.size > readBytes || filteredLines.length > selectedLines.length,
    };
  }

  private filterLines(lines: string[], filter: AdminLogFilter): string[] {
    const search = filter.search?.trim().toLocaleLowerCase();
    const startMs = this.parseFilterDate(filter.startAt);
    const endMs = this.parseFilterDate(filter.endAt);

    return lines.filter((line) => {
      if (search && !line.toLocaleLowerCase().includes(search)) {
        return false;
      }

      if (startMs === null && endMs === null) {
        return true;
      }

      const timestampMs = this.extractTimestampMs(line);
      if (timestampMs === null) {
        return false;
      }
      if (startMs !== null && timestampMs < startMs) {
        return false;
      }
      if (endMs !== null && timestampMs > endMs) {
        return false;
      }
      return true;
    });
  }

  private parseFilterDate(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractTimestampMs(line: string): number | null {
    const jsonTimestamp = this.extractJsonTimestamp(line);
    if (jsonTimestamp !== null) return jsonTimestamp;

    const prefixMatch = line.match(
      /(?:^|\s)(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?)/,
    );
    if (!prefixMatch) return null;
    const normalized = prefixMatch[1].includes('T')
      ? prefixMatch[1]
      : prefixMatch[1].replace(' ', 'T');
    const parsed = Date.parse(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractJsonTimestamp(line: string): number | null {
    const jsonStart = line.indexOf('{');
    if (jsonStart < 0) return null;

    try {
      const parsed = JSON.parse(line.slice(jsonStart)) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      const record = parsed as Record<string, unknown>;
      const value = record.ts ?? record.timestamp ?? record.time;
      if (typeof value !== 'string') return null;
      const timestampMs = Date.parse(value);
      return Number.isFinite(timestampMs) ? timestampMs : null;
    } catch {
      return null;
    }
  }

  private describeReadError(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return '알 수 없는 오류';
  }
}
