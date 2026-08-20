import { NotFoundException } from '@nestjs/common';
import { NaverCommerceImportJobService } from '../naver-commerce-import-job.service';
import { NaverCommerceProductImportService } from '../naver-commerce-product-import.service';
import { SmartStoreImportResult } from '../smartstore-product-import.service';

const result: SmartStoreImportResult = {
  summary: {
    totalRows: 1,
    createCount: 0,
    updateCount: 1,
    skipCount: 0,
    successCount: 1,
    failureCount: 0,
  },
  rows: [],
};

function flushPromises() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

describe('NaverCommerceImportJobService', () => {
  it('starts a preview job immediately and exposes the completed result later', async () => {
    const importService = { preview: jest.fn().mockResolvedValue(result) };
    const jobService = new NaverCommerceImportJobService(
      importService as unknown as NaverCommerceProductImportService,
    );

    const started = jobService.start('preview');

    expect(started).toMatchObject({ type: 'preview' });
    expect(['pending', 'running']).toContain(started.status);
    expect(started.id).toBeTruthy();

    await flushPromises();

    expect(importService.preview).toHaveBeenCalledTimes(1);
    expect(jobService.get(started.id)).toMatchObject({
      id: started.id,
      type: 'preview',
      status: 'completed',
      result,
    });
  });

  it('records failed jobs without throwing from start', async () => {
    const importService = { commit: jest.fn().mockRejectedValue(new Error('네이버 제한')) };
    const jobService = new NaverCommerceImportJobService(
      importService as unknown as NaverCommerceProductImportService,
    );

    const started = jobService.start('commit', ['SKU-1']);
    await flushPromises();

    expect(importService.commit).toHaveBeenCalledWith(['SKU-1']);
    expect(jobService.get(started.id)).toMatchObject({
      type: 'commit',
      status: 'failed',
      error: '네이버 제한',
    });
  });

  it('throws not found for unknown or expired job ids', () => {
    const jobService = new NaverCommerceImportJobService({} as NaverCommerceProductImportService);

    expect(() => jobService.get('missing')).toThrow(NotFoundException);
  });
});
