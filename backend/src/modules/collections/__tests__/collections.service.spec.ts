import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { CollectionsService } from '../collections.service';
import { Collection, CollectionType } from '../entities/collection.entity';

type RepoMock<T extends ObjectLiteral> = jest.Mocked<
  Pick<Repository<T>, 'find' | 'findOne' | 'create' | 'save' | 'remove' | 'update'>
>;

function createRepoMock<T extends ObjectLiteral>(): RepoMock<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  } as unknown as RepoMock<T>;
}

describe('CollectionsService', () => {
  let service: CollectionsService;
  let repo: RepoMock<Collection>;

  beforeEach(async () => {
    repo = createRepoMock<Collection>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: getRepositoryToken(Collection), useValue: repo },
      ],
    }).compile();

    service = module.get(CollectionsService);
  });

  describe('findAllByType', () => {
    it('타입별 활성 컬렉션을 sortOrder ASC 로 조회한다', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAllByType(CollectionType.CLAY);

      expect(repo.find).toHaveBeenCalledWith({
        where: { type: CollectionType.CLAY, isActive: true },
        order: { sortOrder: 'ASC' },
      });
    });

    it('locale=en 이면 nameEn 으로 name/nameKo 를 덮어쓴다', async () => {
      repo.find.mockResolvedValue([
        {
          id: 1,
          type: CollectionType.CLAY,
          name: '진니',
          nameEn: 'Zhuni',
          nameKo: '진니',
          description: '한글 설명',
          descriptionEn: 'English desc',
          isActive: true,
          sortOrder: 0,
        } as unknown as Collection,
      ]);

      const [item] = await service.findAllByType(CollectionType.CLAY, 'en');

      expect(item.name).toBe('Zhuni');
      expect(item.nameKo).toBe('Zhuni');
      expect(item.description).toBe('English desc');
    });

    it('locale=ko 이면 원본 name/nameKo 를 그대로 반환한다', async () => {
      repo.find.mockResolvedValue([
        {
          id: 1,
          type: CollectionType.CLAY,
          name: '진니',
          nameEn: 'Zhuni',
          nameKo: '진니한글',
          description: '한글 설명',
          descriptionEn: 'English desc',
          isActive: true,
          sortOrder: 0,
        } as unknown as Collection,
      ]);

      const [item] = await service.findAllByType(CollectionType.CLAY, 'ko');

      expect(item.name).toBe('진니');
      expect(item.nameKo).toBe('진니한글');
    });
  });

  describe('findAll', () => {
    it('타입과 sortOrder 순서로 모든 컬렉션을 조회한다', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        order: { type: 'ASC', sortOrder: 'ASC' },
      });
    });
  });

  describe('findById', () => {
    it('없는 ID 조회 시 NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null as unknown as Collection);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });

    it('존재 시 locale 적용 후 반환', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        type: CollectionType.SHAPE,
        name: 'Pear Shape',
        nameEn: 'Pear Shape',
        nameKo: '서시',
      } as unknown as Collection);

      const result = await service.findById(1, 'ko');

      expect(result.id).toBe(1);
    });
  });

  describe('create', () => {
    it('repository.create -> save 순으로 호출', async () => {
      const dto = {
        type: CollectionType.CLAY,
        name: 'New Collection',
        productUrl: '/products?collection=new',
      };
      const entity = { id: 1, ...dto } as unknown as Collection;
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(entity);
    });
  });

  describe('update', () => {
    it('기존 엔티티에 dto 머지 후 저장', async () => {
      const existing = { id: 1, name: 'old', type: CollectionType.CLAY } as unknown as Collection;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (entity: unknown) => entity as Collection);

      const result = await service.update(1, { name: 'new' });

      expect(result.name).toBe('new');
    });

    it('없는 ID 수정 시 NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null as unknown as Collection);
      await expect(service.update(999, { name: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('조회 후 remove 호출', async () => {
      const entity = { id: 1 } as Collection;
      repo.findOne.mockResolvedValue(entity);
      repo.remove.mockResolvedValue(entity);

      await service.remove(1);

      expect(repo.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });
  });

  describe('reorder', () => {
    it('순서 일괄 업데이트는 병렬로 update를 호출한다', async () => {
      repo.update.mockResolvedValue({ affected: 1 } as unknown as Awaited<
        ReturnType<Repository<Collection>['update']>
      >);

      await service.reorder([
        { id: 1, sortOrder: 5 },
        { id: 2, sortOrder: 6 },
        { id: 3, sortOrder: 7 },
      ]);

      expect(repo.update).toHaveBeenCalledTimes(3);
      expect(repo.update).toHaveBeenCalledWith(1, { sortOrder: 5 });
      expect(repo.update).toHaveBeenCalledWith(2, { sortOrder: 6 });
      expect(repo.update).toHaveBeenCalledWith(3, { sortOrder: 7 });
    });

    it('일부 update 실패 시 reject 된다 (Promise.all 동작)', async () => {
      repo.update
        .mockResolvedValueOnce({ affected: 1 } as unknown as Awaited<
          ReturnType<Repository<Collection>['update']>
        >)
        .mockRejectedValueOnce(new Error('DB error'));

      await expect(
        service.reorder([
          { id: 1, sortOrder: 1 },
          { id: 2, sortOrder: 2 },
        ]),
      ).rejects.toThrow('DB error');
    });
  });
});
