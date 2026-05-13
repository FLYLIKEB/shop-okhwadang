import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixArtistKoreanSeedText1783700000000 implements MigrationInterface {
  name = 'FixArtistKoreanSeedText1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const artists: Array<{
      name: string;
      productUrl: string;
      title: string;
      story: string;
    }> = [
      {
        name: '주형호',
        productUrl: '/products?categoryId=20',
        title: '주형호 명인',
        story:
          '40년 이상의 경험으로 전통 주형호를 빚어 온 명인입니다. 대나무 마디의 생명감과 곧은 선을 형상에 담아내는 독자적인 기법을 보유하고 있습니다.',
      },
      {
        name: '석표호',
        productUrl: '/products?categoryId=21',
        title: '석표호 명인',
        story:
          '석표호 특유의 삼각 구도와 안정감, 힘 있는 선을 섬세하게 표현하는 실력파 명인입니다. 삼각 뚜껑 손잡이 표현에 깊은 조형 이해를 갖추고 있습니다.',
      },
      {
        name: '서시호',
        productUrl: '/products?categoryId=22',
        title: '서시호 명인',
        story:
          '서시호의 부드럽고 우아한 곡선을 조화롭게 담아내는 명인입니다. 손에 감기는 편안한 사용감과 균형 잡힌 비례로 입문자에게도 추천하기 좋은 작품을 선보입니다.',
      },
    ];

    for (const artist of artists) {
      await queryRunner.query(
        `UPDATE \`artists\`
         SET \`title\` = ?, \`story\` = ?
         WHERE \`name\` = ? AND \`product_url\` = ?
           AND (\`title\` <> ? OR \`story\` <> ?)`,
        [
          artist.title,
          artist.story,
          artist.name,
          artist.productUrl,
          artist.title,
          artist.story,
        ],
      );
    }
  }

  public async down(): Promise<void> {
    // Intentionally no-op: rolling back must not reintroduce corrupted multilingual seed text.
  }
}
