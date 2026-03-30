import * as path from 'path';
import * as fs from 'fs/promises';
import { BadRequestException } from '@nestjs/common';
import { LocalStorageAdapter } from '../local.adapter';

jest.mock('fs/promises');

const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;
  const uploadDir = path.join(process.cwd(), 'uploads');

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('save()', () => {
    it('정상 파일명 → 저장 성공 후 url/filename 반환', async () => {
      const result = await adapter.save('image.jpg', Buffer.from('data'), 'image/jpeg');
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(uploadDir, 'image.jpg'),
        Buffer.from('data'),
      );
      expect(result.url).toBe('/uploads/image.jpg');
      expect(result.filename).toBe('image.jpg');
    });

    it('../ 경로 탐색 → BadRequestException', async () => {
      await expect(
        adapter.save('../etc/passwd', Buffer.from('data'), 'text/plain'),
      ).rejects.toThrow(BadRequestException);
    });

    it('../../ 중첩 경로 탐색 → BadRequestException', async () => {
      await expect(
        adapter.save('../../etc/shadow', Buffer.from('data'), 'text/plain'),
      ).rejects.toThrow(BadRequestException);
    });

    it('슬래시 포함 경로 → BadRequestException', async () => {
      await expect(
        adapter.save('subdir/image.jpg', Buffer.from('data'), 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('백슬래시 포함 경로 → BadRequestException', async () => {
      await expect(
        adapter.save('subdir\\image.jpg', Buffer.from('data'), 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('url에 safeName 사용 (원본 파일명 그대로)', async () => {
      const result = await adapter.save('photo.png', Buffer.from(''), 'image/png');
      expect(result.url).toBe('/uploads/photo.png');
      expect(result.filename).toBe('photo.png');
    });
  });
});
