export type NavGroup = 'gnb' | 'sidebar' | 'footer';

export interface NavGroupInfo {
  label: string;
  desc: string;
  preview: string;
}

// 각 네비게이션 그룹 설명. 에디터 상단 안내·폼 모달 안내에 공용으로 사용.
export const GROUP_INFO: Record<NavGroup, NavGroupInfo> = {
  gnb: {
    label: 'GNB (상단 메뉴)',
    desc: '쇼핑몰 상단 헤더에 항상 표시되는 주요 메뉴입니다. 방문자가 가장 먼저 보는 내비게이션으로, 상품목록·이벤트·브랜드 소개 등 핵심 페이지로 연결합니다.',
    preview: '홈  |  상품목록  |  이벤트  |  브랜드',
  },
  sidebar: {
    label: '사이드바 메뉴',
    desc: '모바일 햄버거 메뉴 또는 PC 좌측 사이드바에 표시되는 메뉴입니다. GNB보다 많은 항목을 담을 수 있으며, 카테고리·마이페이지·고객센터 등 보조 링크에 활용합니다.',
    preview: '≡  홈 / 상품목록 / 마이페이지 / 고객센터',
  },
  footer: {
    label: '푸터 메뉴',
    desc: '페이지 최하단 푸터 영역에 표시되는 링크 모음입니다. 이용약관·개인정보처리방침·회사소개 등 법적 안내 및 부가 정보 링크를 배치합니다.',
    preview: '이용약관  개인정보처리방침  고객센터  회사소개',
  },
};
