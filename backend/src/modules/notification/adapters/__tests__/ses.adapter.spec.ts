import { SesEmailAdapter } from '../ses.adapter';

describe('SesEmailAdapter', () => {
  it('생성 시점에는 throw하지 않음 (DI 안전)', () => {
    expect(() => new SesEmailAdapter()).not.toThrow();
  });

  it('send() 호출 시 stub 에러 발생 (구현 미완료)', async () => {
    const adapter = new SesEmailAdapter();

    await expect(
      adapter.send({ to: 'user@example.com', subject: '제목', html: '<p>본문</p>' }),
    ).rejects.toThrow('SesEmailAdapter is not implemented.');
  });

  it('text 본문 포함 메시지에도 동일하게 stub 에러', async () => {
    const adapter = new SesEmailAdapter();

    await expect(
      adapter.send({ to: 'a@b.com', subject: 's', html: 'h', text: 't' }),
    ).rejects.toThrow(/SesEmailAdapter is not implemented/);
  });
});
