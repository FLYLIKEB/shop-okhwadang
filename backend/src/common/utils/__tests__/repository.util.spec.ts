import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { findOrThrow } from '../repository.util';

interface TestEntity {
  id: number;
  name: string;
}

describe('findOrThrow', () => {
  it('엔티티가 존재하면 반환', async () => {
    const entity: TestEntity = { id: 1, name: 'foo' };
    const repo = {
      findOne: jest.fn().mockResolvedValue(entity),
    } as unknown as Repository<TestEntity>;

    const result = await findOrThrow(repo, { id: 1 }, '없음');

    expect(result).toBe(entity);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('엔티티가 null이면 NotFoundException 발생', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as Repository<TestEntity>;

    await expect(findOrThrow(repo, { id: 999 }, '엔티티 없음')).rejects.toThrow(NotFoundException);
    await expect(findOrThrow(repo, { id: 999 }, '엔티티 없음')).rejects.toThrow('엔티티 없음');
  });

  it('relations 옵션 전달 시 findOne 인자에 포함', async () => {
    const entity: TestEntity = { id: 1, name: 'foo' };
    const repo = {
      findOne: jest.fn().mockResolvedValue(entity),
    } as unknown as Repository<TestEntity>;

    await findOrThrow(repo, { id: 1 }, '없음', ['user', 'product']);

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ['user', 'product'],
    });
  });

  it('relations 미전달 시 findOne 인자에 relations 키 없음', async () => {
    const entity: TestEntity = { id: 1, name: 'foo' };
    const findOne = jest.fn().mockResolvedValue(entity);
    const repo = { findOne } as unknown as Repository<TestEntity>;

    await findOrThrow(repo, { id: 1 }, '없음');

    expect(findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(findOne.mock.calls[0][0]).not.toHaveProperty('relations');
  });
});
