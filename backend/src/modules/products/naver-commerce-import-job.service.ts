import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NaverCommerceProductImportService } from './naver-commerce-product-import.service';
import { SmartStoreImportResult } from './smartstore-product-import.service';

type NaverCommerceImportJobType = 'preview' | 'commit';
type NaverCommerceImportJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface NaverCommerceImportJobSnapshot {
  id: string;
  type: NaverCommerceImportJobType;
  status: NaverCommerceImportJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: SmartStoreImportResult;
  error?: string;
}

interface NaverCommerceImportJobRecord extends NaverCommerceImportJobSnapshot {
  createdAtMs: number;
  selectedIdentifiers?: string[];
}

const JOB_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class NaverCommerceImportJobService {
  private readonly jobs = new Map<string, NaverCommerceImportJobRecord>();

  constructor(
    private readonly naverCommerceProductImportService: NaverCommerceProductImportService,
  ) {}

  start(type: NaverCommerceImportJobType, selectedIdentifiers?: string[]): NaverCommerceImportJobSnapshot {
    this.pruneExpiredJobs();
    const now = new Date();
    const job: NaverCommerceImportJobRecord = {
      id: randomUUID(),
      type,
      status: 'pending',
      createdAt: now.toISOString(),
      createdAtMs: now.getTime(),
      selectedIdentifiers,
    };
    this.jobs.set(job.id, job);

    void this.run(job.id);
    return this.toSnapshot(job);
  }

  get(id: string): NaverCommerceImportJobSnapshot {
    this.pruneExpiredJobs();
    const job = this.jobs.get(id);
    if (!job) {
      throw new NotFoundException('네이버 커머스API 작업을 찾을 수 없습니다.');
    }
    return this.toSnapshot(job);
  }

  private async run(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;

    job.status = 'running';
    job.startedAt = new Date().toISOString();

    try {
      job.result =
        job.type === 'commit'
          ? await this.naverCommerceProductImportService.commit(job.selectedIdentifiers)
          : await this.naverCommerceProductImportService.preview();
      job.status = 'completed';
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : '네이버 커머스API 작업에 실패했습니다.';
    } finally {
      job.completedAt = new Date().toISOString();
    }
  }

  private pruneExpiredJobs(): void {
    const minCreatedAtMs = Date.now() - JOB_TTL_MS;
    for (const [id, job] of this.jobs.entries()) {
      if (job.createdAtMs < minCreatedAtMs) {
        this.jobs.delete(id);
      }
    }
  }

  private toSnapshot(job: NaverCommerceImportJobRecord): NaverCommerceImportJobSnapshot {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      result: job.result,
      error: job.error,
    };
  }
}
