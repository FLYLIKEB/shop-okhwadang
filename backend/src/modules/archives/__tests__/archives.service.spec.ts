import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ArchivesService } from '../archives.service';
import { Artist, NiloType, ProcessStep } from '../entities/archive.entity';

type RepoMock<T extends ObjectLiteral> = jest.Mocked<Pick<Repository<T>, 'find' | 'findOne' | 'create' | 'save' | 'remove' | 'update'>>;

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

describe('ArchivesService', () => {
  let service: ArchivesService;
  let niloRepo: RepoMock<NiloType>;
  let stepRepo: RepoMock<ProcessStep>;
  let artistRepo: RepoMock<Artist>;

  beforeEach(async () => {
    niloRepo = createRepoMock<NiloType>();
    stepRepo = createRepoMock<ProcessStep>();
    artistRepo = createRepoMock<Artist>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchivesService,
        { provide: getRepositoryToken(NiloType), useValue: niloRepo },
        { provide: getRepositoryToken(ProcessStep), useValue: stepRepo },
        { provide: getRepositoryToken(Artist), useValue: artistRepo },
      ],
    }).compile();

    service = module.get(ArchivesService);
  });

  describe('findAllNiloTypes', () => {
    it('활성 항목만 sortOrder ASC 로 조회한다', async () => {
      const items = [
        { id: 1, name: 'A', nameKo: 'A한글', characteristics: ['c1'], characteristicsEn: null, sortOrder: 0, isActive: true },
      ];
      niloRepo.find.mockResolvedValue(items as unknown as NiloType[]);

      const result = await service.findAllNiloTypes();

      expect(niloRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sortOrder: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('A');
    });

    it('locale=en 이면 nameEn 으로 name 을 덮고, characteristicsEn 으로 characteristics 를 치환한다', async () => {
      niloRepo.find.mockResolvedValue([
        {
          id: 1,
          name: '진니',
          nameEn: 'Zhuni',
          nameKo: '진니',
          description: '한글 설명',
          descriptionEn: 'English desc',
          region: '의흥',
          regionEn: 'Yixing',
          characteristics: ['부드러움'],
          characteristicsEn: ['smooth', 'sweet'],
          isActive: true,
          sortOrder: 0,
        } as unknown as NiloType,
      ]);

      const [item] = await service.findAllNiloTypes('en');

      expect(item.name).toBe('Zhuni');
      expect(item.nameKo).toBe('Zhuni');
      expect(item.characteristics).toEqual(['smooth', 'sweet']);
      expect(item.description).toBe('English desc');
      expect(item.region).toBe('Yixing');
    });

    it('locale=en 이지만 characteristicsEn 이 비어있으면 한국어 배열 유지', async () => {
      niloRepo.find.mockResolvedValue([
        {
          id: 2,
          name: '진니',
          nameEn: 'Zhuni',
          nameKo: '진니',
          description: '설명',
          descriptionEn: null,
          characteristics: ['부드러움'],
          characteristicsEn: null,
          isActive: true,
          sortOrder: 0,
        } as unknown as NiloType,
      ]);

      const [item] = await service.findAllNiloTypes('en');

      expect(item.characteristics).toEqual(['부드러움']);
    });
  });

  describe('findAllProcessSteps', () => {
    it('step ASC 정렬로 조회한다', async () => {
      stepRepo.find.mockResolvedValue([]);
      await service.findAllProcessSteps();
      expect(stepRepo.find).toHaveBeenCalledWith({ order: { step: 'ASC' } });
    });
  });

  describe('findAllArtists', () => {
    it('활성 작가만 sortOrder ASC 로 조회한다', async () => {
      artistRepo.find.mockResolvedValue([]);
      await service.findAllArtists();
      expect(artistRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sortOrder: 'ASC' },
      });
    });
  });

  describe('findNiloTypeById', () => {
    it('없는 ID 조회 시 NotFoundException', async () => {
      niloRepo.findOne.mockResolvedValue(null as unknown as NiloType);
      await expect(service.findNiloTypeById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createNiloType', () => {
    it('repository.create -> save 순으로 호출된다', async () => {
      const dto = {
        name: 'Zhuni',
        nameKo: '주니',
        color: '#aa0000',
        region: 'Yixing',
        description: 'desc',
        characteristics: ['smooth'],
        productUrl: '/products?nilo=zhuni',
      };
      const entity = { id: 10, ...dto } as unknown as NiloType;
      niloRepo.create.mockReturnValue(entity);
      niloRepo.save.mockResolvedValue(entity);

      const result = await service.createNiloType(dto);

      expect(niloRepo.create).toHaveBeenCalledWith(dto);
      expect(niloRepo.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('updateNiloType', () => {
    it('기존 엔티티에 dto를 머지한 뒤 저장한다', async () => {
      const existing = { id: 1, name: 'old', isActive: true } as unknown as NiloType;
      niloRepo.findOne.mockResolvedValue(existing);
      niloRepo.save.mockImplementation(async (entity: unknown) => entity as NiloType);

      const result = await service.updateNiloType(1, { name: 'new' });

      expect(result.name).toBe('new');
      expect(niloRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'new' }));
    });

    it('없는 ID 수정 시 NotFoundException', async () => {
      niloRepo.findOne.mockResolvedValue(null as unknown as NiloType);
      await expect(service.updateNiloType(999, { name: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteNiloType', () => {
    it('조회 후 remove 호출', async () => {
      const entity = { id: 1 } as NiloType;
      niloRepo.findOne.mockResolvedValue(entity);
      niloRepo.remove.mockResolvedValue(entity);

      await service.deleteNiloType(1);

      expect(niloRepo.remove).toHaveBeenCalledWith(entity);
    });
  });

  describe('reorderNiloTypes', () => {
    it('reorderEntities 가 update 를 병렬로 호출한다', async () => {
      niloRepo.update.mockResolvedValue({ affected: 1 } as unknown as Awaited<ReturnType<Repository<NiloType>['update']>>);

      await service.reorderNiloTypes([
        { id: 1, sortOrder: 5 },
        { id: 2, sortOrder: 6 },
      ]);

      expect(niloRepo.update).toHaveBeenCalledTimes(2);
      expect(niloRepo.update).toHaveBeenCalledWith(1, { sortOrder: 5 });
      expect(niloRepo.update).toHaveBeenCalledWith(2, { sortOrder: 6 });
    });
  });

  describe('Artist CRUD', () => {
    it('createArtist 는 repo.create -> save 호출', async () => {
      const dto = { name: 'a', title: 't', region: 'r', story: 's', specialty: 'sp', productUrl: 'u' };
      const entity = { id: 1, ...dto } as unknown as Artist;
      artistRepo.create.mockReturnValue(entity);
      artistRepo.save.mockResolvedValue(entity);

      const result = await service.createArtist(dto);
      expect(result).toBe(entity);
    });

    it('updateArtist 는 없는 ID 면 NotFoundException', async () => {
      artistRepo.findOne.mockResolvedValue(null as unknown as Artist);
      await expect(service.updateArtist(999, { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('reorderArtists 는 일괄 update', async () => {
      artistRepo.update.mockResolvedValue({ affected: 1 } as unknown as Awaited<ReturnType<Repository<Artist>['update']>>);

      await service.reorderArtists([
        { id: 10, sortOrder: 1 },
        { id: 11, sortOrder: 2 },
      ]);

      expect(artistRepo.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('ProcessStep CRUD', () => {
    it('createProcessStep -> save 호출', async () => {
      const dto = { step: 1, title: 't', description: 'd', detail: 'detail' };
      const entity = { id: 1, ...dto } as unknown as ProcessStep;
      stepRepo.create.mockReturnValue(entity);
      stepRepo.save.mockResolvedValue(entity);

      const result = await service.createProcessStep(dto);
      expect(result).toBe(entity);
    });

    it('deleteProcessStep 은 없는 ID 면 NotFoundException', async () => {
      stepRepo.findOne.mockResolvedValue(null as unknown as ProcessStep);
      await expect(service.deleteProcessStep(999)).rejects.toThrow(NotFoundException);
    });
  });
});
