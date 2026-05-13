import { QueryRunner } from 'typeorm';
import { SeedArchivesAndCollections1776900000000 } from '../migrations/1776900000000-SeedArchivesAndCollections';
import { FixArtistKoreanSeedText1783700000000 } from '../migrations/1783700000000-FixArtistKoreanSeedText';

const BROKEN_MULTILINGUAL_FRAGMENTS = [
  'Traditional',
  '制造',
  'TRIANGULAR',
  '力量感',
  'を',
  '的实力派',
  '开创者',
  '女性적인',
  '优雅',
  'TOP',
  '初学者',
  'おすすめ',
  '使いやすさ',
];

describe('archive artist Korean seed text', () => {
  it('keeps base artist title/story seed values in natural Korean', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
      }),
    } as unknown as QueryRunner;

    await new SeedArchivesAndCollections1776900000000().up(queryRunner);

    const artistsInsert = queries.find((sql) => sql.includes('INSERT INTO `artists`'));

    expect(artistsInsert).toBeDefined();
    for (const fragment of BROKEN_MULTILINGUAL_FRAGMENTS) {
      expect(artistsInsert).not.toContain(fragment);
    }
  });

  it('backfills existing artist rows without changing English fields', async () => {
    const query = jest.fn<Promise<void>, [string, string[]]>(async () => undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    await new FixArtistKoreanSeedText1783700000000().up(queryRunner);

    expect(query).toHaveBeenCalledTimes(3);
    for (const [sql, params] of query.mock.calls) {
      expect(sql).toContain('UPDATE `artists`');
      expect(sql).toContain('SET `title` = ?, `story` = ?');
      expect(sql).toContain('WHERE `name` = ? AND `product_url` = ?');
      expect(sql).not.toContain('title_en');
      expect(sql).not.toContain('story_en');

      for (const fragment of BROKEN_MULTILINGUAL_FRAGMENTS) {
        expect(params.join(' ')).not.toContain(fragment);
      }
    }
  });
});
