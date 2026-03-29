import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NavigationService } from '../navigation.service';
import { NavigationItem } from '../entities/navigation-item.entity';

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
};

describe('NavigationService', () => {
  let service: NavigationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NavigationService,
        { provide: getRepositoryToken(NavigationItem), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<NavigationService>(NavigationService);
    jest.clearAllMocks();
  });

  describe('findActiveByGroup', () => {
    it('활성 항목만 트리 구조로 반환한다', async () => {
      const items = [
        { id: 1, group: 'gnb', label: '상품', url: '/products', sort_order: 0, is_active: true, parent_id: null },
        { id: 2, group: 'gnb', label: '신상품', url: '/products?sort=newest', sort_order: 0, is_active: true, parent_id: 1 },
      ];
      mockRepository.find.mockResolvedValue(items);

      const result = await service.findActiveByGroup('gnb');
      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].label).toBe('신상품');
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { group: 'gnb', is_active: true },
        order: { sort_order: 'ASC' },
      });
    });
  });

  describe('findAllByGroup', () => {
    it('전체 항목을 트리 구조로 반환한다', async () => {
      const items = [
        { id: 1, group: 'gnb', label: '상품', url: '/products', sort_order: 0, is_active: true, parent_id: null },
        { id: 2, group: 'gnb', label: '비활성', url: '/hidden', sort_order: 1, is_active: false, parent_id: null },
      ];
      mockRepository.find.mockResolvedValue(items);

      const result = await service.findAllByGroup('gnb');
      expect(result).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { group: 'gnb' },
        order: { sort_order: 'ASC' },
      });
    });
  });

  describe('create', () => {
    it('네비게이션 항목을 생성한다', async () => {
      const dto = { group: 'gnb' as const, label: '상품', url: '/products' };
      const created = { id: 1, ...dto, sort_order: 0, is_active: true, parent_id: null };
      mockRepository.create.mockReturnValue(created);
      mockRepository.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result).toEqual(created);
    });

    it('parent_id가 있으면 depth를 검증한다', async () => {
      const dto = { group: 'gnb' as const, label: '하위', url: '/sub', parent_id: 1 };
      // parent exists at depth 1
      mockRepository.findOne.mockResolvedValueOnce({ id: 1, parent_id: null });
      const created = { id: 2, ...dto };
      mockRepository.create.mockReturnValue(created);
      mockRepository.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result).toEqual(created);
    });

    it('depth 초과 → BadRequestException', async () => {
      const dto = { group: 'gnb' as const, label: '깊은 하위', url: '/deep', parent_id: 3 };
      // depth chain: 3 -> 2 -> 1 -> null (already 3 levels, adding child would be 4)
      mockRepository.findOne
        .mockResolvedValueOnce({ id: 3, parent_id: 2 })
        .mockResolvedValueOnce({ id: 2, parent_id: 1 })
        .mockResolvedValueOnce({ id: 1, parent_id: null });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('네비게이션 항목을 수정한다', async () => {
      const item = { id: 1, group: 'gnb', label: '기존', url: '/old', parent_id: null };
      mockRepository.findOne.mockResolvedValue(item);
      mockRepository.save.mockResolvedValue({ ...item, label: '수정됨' });

      const result = await service.update(1, { label: '수정됨' });
      expect(result.label).toBe('수정됨');
    });

    it('존재하지 않는 항목 → NotFoundException', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.update(999, { label: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('자기 자신을 부모로 설정 → BadRequestException (순환 참조)', async () => {
      const item = { id: 1, group: 'gnb', label: '항목', url: '/', parent_id: null };
      mockRepository.findOne.mockResolvedValue(item);

      await expect(service.update(1, { parent_id: 1 })).rejects.toThrow(BadRequestException);
    });

    it('순환 참조 → BadRequestException', async () => {
      const item = { id: 1, group: 'gnb', label: '부모', url: '/', parent_id: null };
      // item 1 wants parent_id = 2, but 2's parent is 1
      mockRepository.findOne
        .mockResolvedValueOnce(item) // find item 1
        .mockResolvedValueOnce({ id: 2, parent_id: 1 }); // check circular: parent of 2 is 1

      await expect(service.update(1, { parent_id: 2 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('네비게이션 항목을 삭제한다', async () => {
      const item = { id: 1, group: 'gnb', label: '삭제할 항목', url: '/' };
      mockRepository.findOne.mockResolvedValue(item);
      mockRepository.remove.mockResolvedValue(item);

      await service.remove(1);
      expect(mockRepository.remove).toHaveBeenCalledWith(item);
    });

    it('존재하지 않는 항목 → NotFoundException', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('순서를 일괄 변경한다', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.reorder({
        orders: [
          { id: 1, sort_order: 2 },
          { id: 2, sort_order: 0 },
        ],
      });

      expect(mockRepository.update).toHaveBeenCalledTimes(2);
    });
  });
});
