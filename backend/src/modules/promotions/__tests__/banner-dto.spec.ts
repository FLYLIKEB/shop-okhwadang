import { validate } from 'class-validator';
import { UpdateBannerDto } from '../dto/create-banner.dto';

describe('banner links and schedules', () => {
  it.each(['/products?promotion=summer', '/en/pages/about#team', 'https://example.com/sale', ''])('accepts safe destination %s', async (linkUrl) => {
    expect(await validate(Object.assign(new UpdateBannerDto(), { linkUrl }))).toEqual([]);
  });

  it.each(['javascript:alert(1)', 'data:text/html,unsafe', '//example.com', '/\\example.com', '/\n/evil.test', 'https://example.com\\evil', 'https://', 'http://example.com'])('rejects unsafe destination %s', async (linkUrl) => {
    expect(await validate(Object.assign(new UpdateBannerDto(), { linkUrl }))).not.toEqual([]);
  });

  it('accepts null dates for removing schedules', async () => {
    expect(await validate(Object.assign(new UpdateBannerDto(), { startsAt: null, endsAt: null }))).toEqual([]);
  });
});
