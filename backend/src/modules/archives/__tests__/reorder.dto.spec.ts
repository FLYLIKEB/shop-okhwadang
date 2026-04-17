import { validate } from 'class-validator';
import { IsInt, Min } from 'class-validator';
import { ReorderItemDto, ReorderItemsDto } from '../dto/reorder.dto';

describe('Reorder DTO', () => {
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
      expect(errors[0].property).toBe('id');
    });

    it('sortOrder가 음수면 실패', async () => {
      const dto = new ReorderItemDto();
      dto.id = 1;
      dto.sortOrder = -1;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('sortOrder');
    });
  });

  describe('ReorderItemsDto', () => {
    it('유효한 orders 배열로 통과', async () => {
      const dto = new ReorderItemsDto();
      dto.orders = [
        Object.assign(new ReorderItemDto(), { id: 1, sortOrder: 0 }),
        Object.assign(new ReorderItemDto(), { id: 2, sortOrder: 1 }),
      ];
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('orders가 배열이 아니면 실패', async () => {
      const dto = new ReorderItemsDto();
      (dto as any).orders = 'not-an-array';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('orders');
    });

    it('orders가 비어있으면 통과 (빈 배열 허용)', async () => {
      const dto = new ReorderItemsDto();
      dto.orders = [];
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('orders 내 각 아이템이 유효하지 않으면 실패', async () => {
      const dto = new ReorderItemsDto();
      dto.orders = [
        Object.assign(new ReorderItemDto(), { id: 1, sortOrder: 0 }),
        Object.assign(new ReorderItemDto(), { id: 2, sortOrder: -1 }),
      ];
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});