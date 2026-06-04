import { describe, expect, it } from 'vitest';
import { getHeaderNavigationLabel } from '@/components/header/navigationLabel';

describe('getHeaderNavigationLabel', () => {
  it('헤더 표시 라벨에서 선행 ㄴ 계층 장식을 제거한다', () => {
    expect(getHeaderNavigationLabel('ㄴ 보이차')).toBe('보이차');
    expect(getHeaderNavigationLabel('ㄴ 다구')).toBe('다구');
    expect(getHeaderNavigationLabel('└ 생차')).toBe('생차');
    expect(getHeaderNavigationLabel('보이차·다구')).toBe('보이차·다구');
  });
});
