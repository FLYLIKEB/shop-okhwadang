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
    return applyLocale(entity, locale, ['name']);
  }

  async findAllNiloTypes(locale?: string): Promise<NiloType[]> {
    const types = await this.niloTypeRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return types.map((t) => this.applyLocaleToNiloType(t, locale));
  }

  async findAllProcessSteps(): Promise<ProcessStep[]> {
    return this.processStepRepository.find({
      order: { step: 'ASC' },
    });
  }

  async findAllArtists(): Promise<Artist[]> {
    return this.artistRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
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
