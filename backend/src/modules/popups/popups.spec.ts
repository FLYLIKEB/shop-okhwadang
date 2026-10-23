import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreatePopupDto, UpdatePopupDto } from './dto/create-popup.dto';
import { Popup } from './entities/popup.entity';
import { PopupsService } from './popups.service';

describe('popup validation', () => {
  const valid = { title: 'Popup', imageUrl: '/uploads/popup.png' };

  it.each(['/uploads/popup.png', 'https://example.com/popup.png', 'http://localhost:3000/popup.png'])('accepts safe URL %s', async (imageUrl) => {
    expect(await validate(plainToInstance(CreatePopupDto, { ...valid, imageUrl }))).toHaveLength(0);
  });

  it.each(['javascript:alert(1)', '//evil.example/image', '/\\evil.example/image', '/image\n.png', 'data:image/png;base64,a', ''])('rejects unsafe URL %s', async (imageUrl) => {
    expect(await validate(plainToInstance(CreatePopupDto, { ...valid, imageUrl }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdatePopupDto, { linkUrl: imageUrl }))).not.toHaveLength(0);
  });

  it.each(['title', 'imageUrl', 'isActive', 'sortOrder'])('rejects null for %s', async (field) => {
    expect(await validate(plainToInstance(CreatePopupDto, { ...valid, [field]: null }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdatePopupDto, { [field]: null }))).not.toHaveLength(0);
  });

  it('rejects whitespace title and malformed dates, while allowing optional clears', async () => {
    expect(await validate(plainToInstance(CreatePopupDto, { ...valid, title: '  ' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdatePopupDto, { startsAt: '2026-02-30' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdatePopupDto, { linkUrl: null, startsAt: null, endsAt: null }))).toHaveLength(0);
    expect(await validate(plainToInstance(UpdatePopupDto, {}))).toHaveLength(0);
  });
});

describe('PopupsService', () => {
  const repository = { create: jest.fn((value) => value), save: jest.fn(async (value) => value), findOne: jest.fn() };
  const service = new PopupsService(repository as unknown as Repository<Popup>);

  beforeEach(() => jest.clearAllMocks());

  it('creates unpublished popups by default and converts dates', async () => {
    const result = await service.create({ title: 'Popup', imageUrl: '/popup.png', startsAt: '2026-01-01T00:00:00Z' });
    expect(result).toMatchObject({ isActive: false, sortOrder: 0, linkUrl: null, startsAt: new Date('2026-01-01T00:00:00Z') });
  });

  it('rejects a partial update that conflicts with the persisted period', async () => {
    repository.findOne.mockResolvedValue({ id: 1, startsAt: new Date('2026-01-01'), endsAt: new Date('2026-02-01') });
    await expect(service.update(1, { startsAt: '2026-03-01T00:00:00Z' })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('clears a scheduled boundary', async () => {
    repository.findOne.mockResolvedValue({ id: 1, startsAt: new Date('2026-01-01'), endsAt: new Date('2026-02-01') });
    expect(await service.update(1, { startsAt: null })).toMatchObject({ startsAt: null, endsAt: new Date('2026-02-01') });
  });
});
