import { validate } from 'class-validator';
import { ReorderItemDto, ReorderItemsDto } from '../dto/reorder.dto';

describe('Reorder DTO (collections)', () => {
  describe('ReorderItemDto', () => {
    it('유효한 데이터로 통과', async () => {
      const dto = new ReorderItemDto();
      dto.id = 1;
      dto.sortOrder = 0;
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('id가 정수가 아니면 실패', async () => {
      const dto = new ReorderItemDto();
      (dto as any).id = 'not-a-number';
      dto.sortOrder = 0;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('sortOrder가 음수면 실패', async () => {
      const dto = new ReorderItemDto();
      dto.id = 1;
      dto.sortOrder = -5;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ReorderItemsDto', () => {
    it('유효한 orders 배열로 통과', async () => {
      const dto = new ReorderItemsDto();
      dto.orders = [
        Object.assign(new ReorderItemDto(), { id: 1, sortOrder: 0 }),
        Object.assign(new ReorderItemDto(), { id: 2, sortOrder: 1 }),
        Object.assign(new ReorderItemDto(), { id: 3, sortOrder: 2 }),
      ];
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('orders가 비어있으면 통과', async () => {
      const dto = new ReorderItemsDto();
      dto.orders = [];
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});