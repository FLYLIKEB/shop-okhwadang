import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NiloType, ProcessStep, Artist } from './entities/archive.entity';
import { findOrThrow } from '../../common/utils/repository.util';
import { reorderEntities } from '../../common/utils/reorder.util';
import { applyLocale } from '../../common/utils/locale.util';
import {
  CreateNiloTypeDto,
  UpdateNiloTypeDto,
  CreateProcessStepDto,
  UpdateProcessStepDto,
  CreateArtistDto,
  UpdateArtistDto,
} from './dto/archive.dto';

@Injectable()
export class ArchivesService {
  constructor(
    @InjectRepository(NiloType)
    private readonly niloTypeRepository: Repository<NiloType>,
    @InjectRepository(ProcessStep)
    private readonly processStepRepository: Repository<ProcessStep>,
    @InjectRepository(Artist)
    private readonly artistRepository: Repository<Artist>,
  ) {}

  private applyLocaleToNiloType(entity: NiloType, locale?: string): NiloType {
    const localized = applyLocale(entity, locale, ['name', 'description', 'region']);
    if (locale && locale !== 'ko') {
      // nameKo 는 한글 고정 컬럼이므로 en 로케일에서는 name(localized)으로 override
      if (localized.name) localized.nameKo = localized.name;
      // characteristics 는 JSON 배열이므로 characteristicsEn 이 있으면 치환
      if (entity.characteristicsEn && entity.characteristicsEn.length > 0) {
        localized.characteristics = entity.characteristicsEn;
      }
    }
    return localized;
  }

  private applyLocaleToProcessStep(entity: ProcessStep, locale?: string): ProcessStep {
    return applyLocale(entity, locale, ['title', 'description', 'detail']);
  }

  private applyLocaleToArtist(entity: Artist, locale?: string): Artist {
    return applyLocale(entity, locale, ['name', 'title', 'region', 'story', 'specialty']);
  }

  async findAllNiloTypes(locale?: string): Promise<NiloType[]> {
    const types = await this.niloTypeRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return types.map((t) => this.applyLocaleToNiloType(t, locale));
  }

  async findAllProcessSteps(locale?: string): Promise<ProcessStep[]> {
    const steps = await this.processStepRepository.find({
      order: { step: 'ASC' },
    });
    return steps.map((s) => this.applyLocaleToProcessStep(s, locale));
  }

  async findAllArtists(locale?: string): Promise<Artist[]> {
    const artists = await this.artistRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return artists.map((a) => this.applyLocaleToArtist(a, locale));
  }

  async findNiloTypeById(id: number): Promise<NiloType> {
    return findOrThrow(this.niloTypeRepository, { id }, '니로타입을 찾을 수 없습니다.');
  }

  async createNiloType(dto: CreateNiloTypeDto): Promise<NiloType> {
    const niloType = this.niloTypeRepository.create(dto);
    return this.niloTypeRepository.save(niloType);
  }

  async updateNiloType(id: number, dto: UpdateNiloTypeDto): Promise<NiloType> {
    const niloType = await this.findNiloTypeById(id);
    Object.assign(niloType, dto);
    return this.niloTypeRepository.save(niloType);
  }

  async deleteNiloType(id: number): Promise<void> {
    const niloType = await this.findNiloTypeById(id);
    await this.niloTypeRepository.remove(niloType);
  }

  async reorderNiloTypes(items: { id: number; sortOrder: number }[]): Promise<void> {
    await reorderEntities(this.niloTypeRepository, items);
  }

  async findProcessStepById(id: number): Promise<ProcessStep> {
    return findOrThrow(this.processStepRepository, { id }, '공정 단계를 찾을 수 없습니다.');
  }

  async createProcessStep(dto: CreateProcessStepDto): Promise<ProcessStep> {
    const processStep = this.processStepRepository.create(dto);
    return this.processStepRepository.save(processStep);
  }

  async updateProcessStep(id: number, dto: UpdateProcessStepDto): Promise<ProcessStep> {
    const processStep = await this.findProcessStepById(id);
    Object.assign(processStep, dto);
    return this.processStepRepository.save(processStep);
  }

  async deleteProcessStep(id: number): Promise<void> {
    const processStep = await this.findProcessStepById(id);
    await this.processStepRepository.remove(processStep);
  }

  async findArtistById(id: number): Promise<Artist> {
    return findOrThrow(this.artistRepository, { id }, '아티스트를 찾을 수 없습니다.');
  }

  async createArtist(dto: CreateArtistDto): Promise<Artist> {
    const artist = this.artistRepository.create(dto);
    return this.artistRepository.save(artist);
  }

  async updateArtist(id: number, dto: UpdateArtistDto): Promise<Artist> {
    const artist = await this.findArtistById(id);
    Object.assign(artist, dto);
    return this.artistRepository.save(artist);
  }

  async deleteArtist(id: number): Promise<void> {
    const artist = await this.findArtistById(id);
    await this.artistRepository.remove(artist);
  }

  async reorderArtists(items: { id: number; sortOrder: number }[]): Promise<void> {
    await reorderEntities(this.artistRepository, items);
  }
}
