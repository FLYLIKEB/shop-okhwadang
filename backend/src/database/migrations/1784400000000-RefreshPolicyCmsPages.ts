import { MigrationInterface, QueryRunner } from 'typeorm';

interface PolicyPageSeed {
  slug: 'terms' | 'privacy';
  title: string;
  titleEn: string;
  content: {
    html: string;
    html_en: string;
    textAlign: 'left';
    template: 'default';
  };
}

const POLICY_PAGES: PolicyPageSeed[] = [
  {
    "slug": "terms",
    "title": "이용약관",
    "titleEn": "Terms of Service",
    "content": {
      "html": "<h1>옥화당 이용약관</h1><p><strong>시행일:</strong> 2026-04-20</p>\n<h2>제1조 (목적)</h2><p>본 약관은 서로 인터내셔널(이하 \"회사\")이 운영하는 옥화당(ockhwadang.com, 이하 \"몰\")에서 제공하는 자사호·보이차·다구 D2C 온라인 쇼핑몰 서비스의 이용에 관한 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>\n<h2>제2조 (정의)</h2><ol><li>\"몰\"이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 등을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.</li><li>\"이용자\"란 몰에 접속하여 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li><li>\"회원\"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며 몰이 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li><li>\"재화 등\"이란 몰을 통해 판매되는 자사호·보이차·다구 등 상품, 콘텐츠, 디지털 재화 및 서비스를 말합니다.</li></ol>\n<h2>제3조 (약관의 명시와 개정)</h2><p>회사는 본 약관의 내용과 상호, 영업소 소재지, 대표자 성명, 사업자등록번호, 통신판매업 신고번호, 연락처를 이용자가 쉽게 알 수 있도록 몰의 초기 서비스화면에 게시합니다. 회사는 약관을 개정할 경우 적용일자 7일 이전(이용자에게 불리한 경우 30일 이전)부터 공지합니다.</p>\n<h2>제4조 (이용계약의 성립)</h2><p>이용계약은 회원이 약관에 동의하고 회원가입을 신청하면 회사가 이를 승낙함으로써 체결됩니다. 타인 명의 도용, 허위 정보 기재, 만 14세 미만 아동의 법정대리인 동의 없는 신청은 승낙하지 않을 수 있습니다.</p>\n<h2>제5조 (서비스의 제공 및 변경)</h2><p>회사는 자사호·보이차·다구 등 상품의 온라인 판매, 상품 정보 제공, 주문·결제·배송 처리, 고객 문의 응대 업무를 수행합니다. 서비스 내용이 변경될 경우 즉시 공지합니다.</p>\n<h2>제6조 (구매신청 및 계약 성립)</h2><p>이용자는 재화 검색 및 선택, 수령자 정보 입력, 약관 동의, 결제 수단 선택 등의 방법으로 구매를 신청합니다. 계약은 회사의 수신확인통지가 이용자에게 도달한 시점에 성립됩니다.</p>\n<h2>제7조 (지급방법)</h2><p>재화 등의 대금은 계좌이체, 신용카드·체크카드, 토스페이먼츠, Stripe, 포인트 등 회사가 정한 결제 수단으로 지급합니다. 회사는 이용자의 지급방법에 어떠한 수수료도 추가 징수하지 않습니다.</p>\n<h2>제8조 (재화의 공급 및 환급)</h2><p>회사는 구매신청일로부터 7일 이내에 배송할 수 있도록 조치합니다. 품절 등의 사유로 공급이 불가한 경우, 대금 수령일로부터 3영업일 이내에 환급합니다.</p>\n<h2>제9조 (청약철회)</h2><p>이용자는 재화 수령 후 7일 이내에 청약을 철회할 수 있습니다. 단, 이용자의 귀책으로 재화가 멸실·훼손된 경우, 사용·소비로 가치가 현저히 감소한 경우, 시간 경과로 재판매가 곤란한 경우에는 청약철회가 제한됩니다. 반환 후 3영업일 이내에 환급합니다.</p>\n<h2>제10조 (개인정보 보호)</h2><p>회사는 서비스 제공에 필요한 최소한의 개인정보를 수집합니다. 자세한 사항은 <a href=\"/pages/privacy\">개인정보처리방침</a>을 참고하시기 바랍니다.</p>\n<h2>제11조 (회사의 의무)</h2><p>회사는 법령과 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 지속적이고 안정적인 서비스 제공을 위해 최선을 다합니다.</p>\n<h2>제12조 (이용자의 의무)</h2><p>이용자는 허위 정보 등록, 타인 정보 도용, 회사 정보 무단 변경, 저작권 침해, 명예훼손, 불법 정보 게시 등의 행위를 하여서는 안 됩니다.</p>\n<h2>제13조 (저작권)</h2><p>회사가 작성한 저작물에 대한 저작권은 회사에 귀속합니다. 이용자는 회사의 사전 승낙 없이 영리 목적으로 이용할 수 없습니다.</p>\n<h2>제14조 (분쟁해결 및 준거법)</h2><p>회사와 이용자 간 분쟁은 대한민국 법을 준거법으로 하며, 소송은 이용자 주소지 관할 지방법원의 전속관할로 합니다.</p>\n<hr/>\n<h3>사업자 정보</h3>\n<ul>\n<li><strong>상호명:</strong> 서로 인터내셔널</li>\n<li><strong>대표자:</strong> 권준현</li>\n<li><strong>사업자등록번호:</strong> 131-72-05631</li>\n<li><strong>통신판매업번호:</strong> 2026-서울강남-01632</li>\n<li><strong>소재지:</strong> 서울특별시 강남구 역삼로 114 (현죽빌딩) 8층 8028호 (우 06252)</li>\n<li><strong>고객센터:</strong> 010-2908-0393</li>\n<li><strong>이메일:</strong> seorointernational@naver.com</li>\n</ul>\n<p><em>본 약관은 2026-04-20부터 시행됩니다.</em></p>",
      "html_en": "<h1>Ockhwadang Terms of Service</h1><p><strong>Effective Date:</strong> 2026-04-20</p>\n<p>These Terms govern the rights, obligations, and responsibilities between Seoro International (the \"Company\") and users in connection with the use of Ockhwadang (ockhwadang.com) — a D2C online shop for teapots (zisha), pu-erh tea, and tea ware.</p>\n<h2>Article 1 (Purpose)</h2><p>These Terms regulate the general conditions for use of the online shopping service operated by the Company.</p>\n<h2>Article 2 (Definitions)</h2><p>\"Service\" means the D2C online shop for teapots, pu-erh tea, and tea ware. \"Member\" means a registered user. \"Goods\" means teapots, pu-erh tea, tea ware, and other products sold through the Service.</p>\n<h2>Article 3 (Amendment of Terms)</h2><p>The Company announces amendments at least 7 days before the effective date (30 days for amendments unfavorable to users).</p>\n<h2>Article 4 (Formation of Agreement)</h2><p>Service agreements are formed upon the Company's acceptance of a membership application. The Company may refuse applications involving false information, identity theft, or applications by children under 14 without legal representative consent.</p>\n<h2>Article 5 (Services Provided)</h2><p>The Company provides online sales of teapots, pu-erh tea, and tea ware; order, payment, and delivery processing; and customer support.</p>\n<h2>Article 6 (Purchase and Contract Formation)</h2><p>Users apply for purchases by selecting goods, entering delivery information, agreeing to terms, and selecting a payment method. Contracts are formed upon delivery of purchase confirmation notice.</p>\n<h2>Article 7 (Payment Methods)</h2><p>Payment may be made by bank transfer, credit/debit card, Toss Payments, Stripe, or reward points. No additional fees are charged for the user's chosen payment method.</p>\n<h2>Article 8 (Delivery and Refunds)</h2><p>Delivery is arranged within 7 days of purchase. In case of unavailability, refunds are processed within 3 business days of payment receipt.</p>\n<h2>Article 9 (Withdrawal of Subscription)</h2><p>Users may withdraw subscription within 7 days of receiving goods. Restrictions apply when goods are damaged by user fault, significantly reduced in value through use, or when packaging of reproducible goods has been opened. Refunds are processed within 3 business days of return receipt.</p>\n<h2>Article 10 (Privacy Protection)</h2><p>The Company collects minimum personal information necessary for service provision. For details, see the <a href=\"/en/pages/privacy-en\">Privacy Policy</a>.</p>\n<h2>Article 11 (User Obligations)</h2><p>Users must not register false information, use another person's identity, infringe intellectual property rights, damage the Company's reputation, or post illegal content.</p>\n<h2>Article 12 (Copyright)</h2><p>Copyright for works created by the Company belongs to the Company. Users may not use such works for commercial purposes without prior consent.</p>\n<h2>Article 13 (Dispute Resolution and Governing Law)</h2><p>Korean law governs these Terms. Disputes are subject to the exclusive jurisdiction of the district court having jurisdiction over the user's address.</p>\n<hr/>\n<h3>Business Information</h3>\n<ul>\n<li><strong>Trade Name:</strong> Seoro International</li>\n<li><strong>Representative:</strong> Kwon Junhyun</li>\n<li><strong>Business Registration No.:</strong> 131-72-05631</li>\n<li><strong>Mail-Order Business No.:</strong> 2026-서울강남-01632</li>\n<li><strong>Address:</strong> 8028, 8F, 114 Yeoksam-ro, Gangnam-gu, Seoul, Republic of Korea (06252)</li>\n<li><strong>Customer Service:</strong> 010-2908-0393</li>\n<li><strong>Email:</strong> seorointernational@naver.com</li>\n</ul>\n<p><em>These Terms take effect on 2026-04-20.</em></p>",
      "textAlign": "left",
      "template": "default"
    }
  },
  {
    "slug": "privacy",
    "title": "개인정보처리방침",
    "titleEn": "Privacy Policy",
    "content": {
      "html": "<h1>옥화당 개인정보 처리방침</h1><p><strong>시행일:</strong> 2026-04-20 (최초 제정)</p>\n<p>서로 인터내셔널(이하 \"회사\")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>\n<h2>제1조 개인정보의 처리 목적</h2><ul><li>회원 관리 — 회원 식별·본인 확인, 부정 이용 방지, 불만 처리</li><li>서비스 제공 — 상품 주문·결제·배송, 고객 문의 응대</li><li>맞춤형 추천 및 서비스 개선 — 이용 통계·분석, 개인화 상품 추천</li><li>마케팅 및 광고 — 이벤트·프로모션 안내, 맞춤형 광고 (별도 동의 시)</li></ul>\n<h2>제2조 처리하는 개인정보의 항목</h2><p><strong>필수:</strong> 이름, 이메일, 전화번호, 주소(배송지)<br/><strong>선택:</strong> 마케팅 수신 동의 정보<br/><strong>자동 수집:</strong> IP 주소, 쿠키, 서비스 이용 기록, 방문 기록<br/><strong>소셜 로그인:</strong> Kakao(닉네임, 이메일), Google(이름, 이메일, 프로필 이미지)</p>\n<h2>제3조 개인정보의 처리 및 보유 기간</h2><table><thead><tr><th>처리 업무</th><th>보유 기간</th><th>법령 근거</th></tr></thead><tbody><tr><td>회원 정보</td><td>회원 탈퇴 시까지</td><td>회원 서비스 계약</td></tr><tr><td>계약·청약철회·결제·공급 기록</td><td>5년</td><td>전자상거래법 제6조</td></tr><tr><td>소비자 불만·분쟁처리 기록</td><td>3년</td><td>전자상거래법 제6조</td></tr><tr><td>표시·광고 기록</td><td>6개월</td><td>전자상거래법 제6조</td></tr><tr><td>접속 로그</td><td>3개월</td><td>통신비밀보호법</td></tr><tr><td>마케팅 수신 동의 기록</td><td>동의 철회 시까지</td><td>정보통신망법</td></tr></tbody></table>\n<h2>제4조 개인정보의 제3자 제공</h2><table><thead><tr><th>제공받는 자</th><th>제공 목적</th><th>제공 항목</th><th>보유 기간</th></tr></thead><tbody><tr><td>택배사(CJ대한통운, 한진 등)</td><td>상품 배송</td><td>이름, 주소, 전화번호</td><td>배송 완료 후 3개월</td></tr></tbody></table>\n<h2>제5조 개인정보 처리의 위탁</h2><table><thead><tr><th>수탁자</th><th>위탁 업무</th><th>국가</th></tr></thead><tbody><tr><td>토스페이먼츠</td><td>국내 결제 처리</td><td>대한민국</td></tr><tr><td>Stripe, Inc.</td><td>해외 결제 처리</td><td>미국</td></tr><tr><td>Amazon Web Services, Inc.</td><td>서버 운영 및 파일 저장</td><td>미국</td></tr><tr><td>Vercel Inc.</td><td>프론트엔드 호스팅</td><td>미국</td></tr><tr><td>Google LLC (Google Analytics)</td><td>서비스 이용 통계 분석</td><td>미국</td></tr></tbody></table>\n<h2>제6조 개인정보의 파기 절차 및 방법</h2><p>보유기간 경과 또는 처리목적 달성 시 지체 없이 파기합니다. 전자적 파일은 복구 불가능한 방법으로 영구 삭제하며, 종이 문서는 분쇄 또는 소각합니다. 법령에 따라 보존이 필요한 경우 별도 보관합니다.</p>\n<h2>제7조 정보주체의 권리·의무 및 행사 방법</h2><p>정보주체는 언제든지 열람, 정정, 삭제, 처리정지, 전송요구 권리를 행사할 수 있습니다. 14세 미만 아동의 경우 법정대리인이 대리 행사할 수 있습니다.</p><ul><li>이메일: seorointernational@naver.com</li><li>전화: 010-2908-0393</li><li>우편: 서울특별시 강남구 역삼로 114 (현죽빌딩) 8층 8028호 (우 06252)</li><li>온라인: 마이페이지 개인정보 관리</li></ul>\n<h2>제8조 쿠키 및 행태정보</h2><p>회사는 맞춤서비스 제공을 위해 쿠키를 사용합니다. Chrome·Safari·Edge·Firefox 설정에서 쿠키를 거부할 수 있습니다(서비스 이용 일부 제약 가능). Google Analytics를 통해 서비스 이용 통계 및 맞춤형 광고 목적으로 쿠키·방문 기록을 수집하며, 거부는 /cookie-settings 페이지에서 가능합니다.</p>\n<h2>제9조 개인정보의 안전성 확보 조치</h2><p>내부관리계획 수립·시행, 접근권한 관리, 접속기록 보관, 암호화, 침입차단·탐지 시스템 운영, 전산실 접근 통제 등 관리적·기술적·물리적 보호조치를 시행합니다.</p>\n<h2>제10조 개인정보 보호책임자</h2><ul><li><strong>성명:</strong> 권준현</li><li><strong>직책:</strong> 대표</li><li><strong>연락처:</strong> 010-2908-0393</li><li><strong>이메일:</strong> seorointernational@naver.com</li></ul>\n<h2>제11조 14세 미만 아동의 개인정보 처리</h2><p>14세 미만 아동의 개인정보 수집 시 법정대리인의 동의를 받습니다. 동의 확인 방법: 회원가입 시 법정대리인 이메일 인증. 법정대리인은 아동 정보에 대한 열람·정정·삭제·처리정지를 요구할 수 있습니다.</p>\n<h2>권익침해 구제 방법</h2><ul><li>개인정보분쟁조정위원회: 1833-6972 (www.kopico.go.kr)</li><li>개인정보침해신고센터: 118 (privacy.kisa.or.kr)</li><li>대검찰청: 1301 (www.spo.go.kr)</li><li>경찰청: 182 (ecrm.police.go.kr)</li></ul>\n<p><em>본 방침은 2026-04-20부터 시행됩니다. 변경 시 시행 7일 전 공지합니다.</em></p>",
      "html_en": "<h1>Ockhwadang Privacy Policy</h1><p><strong>Effective Date:</strong> 2026-04-20 (Initial Publication)</p>\n<p>Seoro International (the \"Company\") establishes and publicly discloses this Privacy Policy pursuant to Article 30 of the Korean Personal Information Protection Act (\"PIPA\") to protect personal information of data subjects and to promptly handle any related grievances.</p>\n<h2>Article 1. Purposes of Processing Personal Information</h2><ul><li>Member management — identification, fraud prevention, complaint handling</li><li>Service provision — order, payment, delivery, customer support</li><li>Personalization and service improvement — usage analytics, personalized recommendations</li><li>Marketing and advertising — promotions and targeted advertising (with separate consent)</li></ul>\n<h2>Article 2. Categories of Personal Information Processed</h2><p><strong>Required:</strong> Name, email, phone number, delivery address<br/><strong>Optional:</strong> Marketing consent information<br/><strong>Automatically collected:</strong> IP address, cookies, usage records, visit records<br/><strong>Social login:</strong> Kakao (nickname, email), Google (name, email, profile image)</p>\n<h2>Article 3. Retention and Use Period</h2><table><thead><tr><th>Purpose</th><th>Retention Period</th><th>Legal Basis</th></tr></thead><tbody><tr><td>Member information</td><td>Until membership withdrawal</td><td>Member service agreement</td></tr><tr><td>Contract, withdrawal, payment, supply records</td><td>5 years</td><td>E-Commerce Act Art. 6</td></tr><tr><td>Consumer complaint records</td><td>3 years</td><td>E-Commerce Act Art. 6</td></tr><tr><td>Advertising records</td><td>6 months</td><td>E-Commerce Act Art. 6</td></tr><tr><td>Access logs</td><td>3 months</td><td>Communications Privacy Act</td></tr><tr><td>Marketing consent records</td><td>Until consent withdrawal</td><td>Network Act</td></tr></tbody></table>\n<h2>Article 4. Provision of Personal Information to Third Parties</h2><table><thead><tr><th>Recipient</th><th>Purpose</th><th>Items</th><th>Retention Period</th></tr></thead><tbody><tr><td>Courier companies (CJ Logistics, Hanjin, etc.)</td><td>Product delivery</td><td>Name, address, phone number</td><td>3 months after delivery</td></tr></tbody></table>\n<h2>Article 5. Outsourcing of Personal Information Processing</h2><table><thead><tr><th>Processor</th><th>Outsourced Task</th><th>Country</th></tr></thead><tbody><tr><td>Toss Payments</td><td>Domestic payment processing</td><td>Republic of Korea</td></tr><tr><td>Stripe, Inc.</td><td>International payment processing</td><td>USA</td></tr><tr><td>Amazon Web Services, Inc.</td><td>Server operation and file storage</td><td>USA</td></tr><tr><td>Vercel Inc.</td><td>Frontend hosting</td><td>USA</td></tr><tr><td>Google LLC (Google Analytics)</td><td>Service usage analytics</td><td>USA</td></tr></tbody></table>\n<h2>Article 6. Destruction Procedure and Method</h2><p>Personal information is destroyed without delay when the retention period expires or the processing purpose is achieved. Electronic files are permanently deleted using methods preventing recovery; paper documents are shredded or incinerated.</p>\n<h2>Article 7. Rights of Data Subjects and Legal Representatives</h2><p>Data subjects may exercise rights of access, correction, deletion, suspension of processing, and data portability at any time. For children under 14, legal representatives may exercise these rights.</p><ul><li>Email: seorointernational@naver.com</li><li>Phone: 010-2908-0393</li><li>Mail: 8028, 8F, 114 Yeoksam-ro, Gangnam-gu, Seoul, Republic of Korea (06252)</li><li>Online: My Page &gt; Personal Information Management</li></ul>\n<h2>Article 8. Cookies and Behavioral Information</h2><p>The Company uses cookies for personalized services. Cookies may be refused through browser settings (Chrome, Safari, Edge, Firefox, iOS, Android), though some service features may be limited. Google Analytics collects cookies and visit records for analytics and targeted advertising. Opt-out is available at /cookie-settings.</p>\n<h2>Article 9. Security Measures</h2><p>The Company implements administrative, technical, and physical measures including access privilege management, access log retention, encryption, intrusion prevention/detection systems, and physical access control.</p>\n<h2>Article 10. Data Protection Officer</h2><ul><li><strong>Name:</strong> Kwon Junhyun</li><li><strong>Title:</strong> Representative</li><li><strong>Phone:</strong> 010-2908-0393</li><li><strong>Email:</strong> seorointernational@naver.com</li></ul>\n<h2>Article 11. Processing of Children's Personal Information (Under 14)</h2><p>The Company obtains legal representative consent when collecting personal information from children under 14. Consent is verified via legal representative email verification at registration.</p>\n<h2>Remedies for Infringement of Data Subject Rights</h2><ul><li>Personal Information Dispute Mediation Committee: 1833-6972 (www.kopico.go.kr)</li><li>Personal Information Infringement Report Center: 118 (privacy.kisa.or.kr)</li><li>Supreme Prosecutors' Office: 1301 (www.spo.go.kr)</li><li>Korean National Police Agency: 182 (ecrm.police.go.kr)</li></ul>\n<p><em>This Privacy Policy takes effect on 2026-04-20. Changes will be announced at least 7 days before the effective date.</em></p>",
      "textAlign": "left",
      "template": "default"
    }
  }
];

const LEGACY_POLICY_PAGES: PolicyPageSeed[] = [
  {
    "slug": "terms",
    "title": "이용약관",
    "titleEn": "Terms of Service",
    "content": {
      "html": "<h2>이용약관</h2><p>본 약관은 옥화당(이하 \"당사\")이 운영하는 온라인 쇼핑몰에서 제공하는 서비스의 이용 조건을 정합니다.</p><h3>제1조 (목적)</h3><p>본 약관은 당사가 운영하는 온라인 쇼핑몰 서비스(이하 \"서비스\")의 이용에 관한 일반적인 조건을 규정합니다.</p><h3>제2조 (이용계약의 성립)</h3><p>이용자는 당사가 정한 이용 계약 조건에 동의한 후 서비스를 이용함으로써 이용 계약이 성립합니다.</p><h3>제3조 (서비스의 제공 및 변경)</h3><p>당사는 서비스의 내용, 이용 시간, 중단 등의 사항을 변경할 수 있으며, 이 경우 사전에 고지합니다.</p><h3>제4조 (결제)</h3><p>서비스 이용에 대한 대금 결제는 당사가 정한 결제 수단으로 할 수 있으며, 카드결제/무통장입금 등을 지원합니다.</p><h3>제5조 (환불)</h3><p>결제 취소 및 환불은 상품 수령 후 7일 이내에 신청 가능하며, 당사의 환불 정책에 따릅니다.</p><h3>제6조 (책임)</h3><p>당사는 서비스 제공 시 성실한 주의 의무를 다하나, 불가항력에 의한 서비스 중단은 책임지지 않습니다.</p><h3>제7조 (분쟁 해결)</h3><p>서비스 이용 관련 분쟁은 당사의 고객센터를 통해 해결하며, 합의가 이루어지지 않을 경우 관할 법원에 소송할 수 있습니다.</p>",
      "html_en": "<h2>Terms of Service</h2><p>These terms govern your use of the Ockhwadang online shopping service (\"Service\"). By using the Service, you agree to these terms.</p>",
      "textAlign": "left",
      "template": "default"
    }
  },
  {
    "slug": "privacy",
    "title": "개인정보처리방침",
    "titleEn": "Privacy Policy",
    "content": {
      "html": "<h2>개인정보처리방침</h2><p>옥화당(이하 \"당사\")는 이용자의 개인정보를 소중히 취급하며, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 준수합니다.</p><h3>1. 수집하는 개인정보 항목</h3><ul><li><strong>필수:</strong> 이름, 이메일, 연락처, 주소</li><li><strong>선택:</strong> 생년월일, 성별 (회원 가입 시)</li><li><strong>자동 수집:</strong> IP 주소, 쿠키, 방문 기록</li></ul><h3>2. 개인정보의 수집 및 이용 목적</h3><p>수집한 개인정보는 서비스 제공, 계약 이행, 고객 관리, 마케팅/광고 등에 이용됩니다.</p><h3>3. 개인정보의 보유 기간</h3><p>이용자의 개인정보는 가입 해지 시까지 보유하며, 관련 법령에 따라 일정 기간 보존합니다. (계약이행 관련: 5년, 소비자분쟁: 3년)</p><h3>4. 개인정보의 제3자 제공</h3><p>당사는 이용자의 사전 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 법률에 의한 경우나 서비스 제공에 필수적인 경우 예외로 합니다.</p><h3>5. 이용자 권리</h3><p>이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리 정지 요구 등 권리를 가지며, 언제든 고객센터를 통해 신청할 수 있습니다.</p><h3>6. 개인정보 보호 책임자</h3><p>책임자: 옥화당 고객센터 | 이메일: help@okhwandang.com</p>",
      "html_en": "<h2>Privacy Policy</h2><p>Ockhwadang processes customer personal information safely in accordance with applicable privacy laws.</p>",
      "textAlign": "left",
      "template": "default"
    }
  }
];

export class RefreshPolicyCmsPages1784400000000 implements MigrationInterface {
  name = 'RefreshPolicyCmsPages1784400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.upsertPolicyPages(queryRunner, POLICY_PAGES);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.upsertPolicyPages(queryRunner, LEGACY_POLICY_PAGES);
  }

  private async upsertPolicyPages(queryRunner: QueryRunner, pages: PolicyPageSeed[]): Promise<void> {
    for (const page of pages) {
      await queryRunner.query(
        `INSERT INTO \`pages\` (\`slug\`, \`title\`, \`title_en\`, \`template\`, \`is_published\`)
         VALUES (?, ?, ?, 'default', 1)
         ON DUPLICATE KEY UPDATE
           \`title\` = VALUES(\`title\`),
           \`title_en\` = VALUES(\`title_en\`),
           \`template\` = VALUES(\`template\`),
           \`is_published\` = VALUES(\`is_published\`)`,
        [page.slug, page.title, page.titleEn],
      );

      const [row] = await queryRunner.query(`SELECT \`id\` FROM \`pages\` WHERE \`slug\` = ? LIMIT 1`, [page.slug]);
      if (!row) continue;

      const [existingBlock] = await queryRunner.query(
        `SELECT \`id\` FROM \`page_blocks\` WHERE \`page_id\` = ? AND \`type\` = 'text_content' ORDER BY \`sort_order\` LIMIT 1`,
        [row.id],
      );

      if (existingBlock) {
        await queryRunner.query(
          `UPDATE \`page_blocks\`
             SET \`content\` = ?, \`sort_order\` = 0, \`is_visible\` = 1
           WHERE \`id\` = ?`,
          [JSON.stringify(page.content), existingBlock.id],
        );
        await queryRunner.query(
          `UPDATE \`page_blocks\`
             SET \`is_visible\` = 0
           WHERE \`page_id\` = ? AND \`type\` = 'text_content' AND \`id\` <> ?`,
          [row.id, existingBlock.id],
        );
      } else {
        await queryRunner.query(
          `INSERT INTO \`page_blocks\` (\`page_id\`, \`type\`, \`content\`, \`sort_order\`, \`is_visible\`)
           VALUES (?, 'text_content', ?, 0, 1)`,
          [row.id, JSON.stringify(page.content)],
        );
      }
    }
  }
}
