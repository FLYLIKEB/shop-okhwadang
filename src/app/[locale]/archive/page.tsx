import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/components/ui/utils';
import { TEAPOT_IMAGES } from '@/lib/teapot-images';

export const metadata: Metadata = {
  title: 'Archive — 니료 산지 기록 & 공정 스토리',
  description: '자사호의 원료인 니료(泥料) 산지 기록과 채토·연토·성형·소성 공정 스토리, 그리고 장인 인터뷰를 담은 아카이브입니다.',
};

// ─── 데이터 ───────────────────────────────────────────────────────

interface NiloEntry {
  id: string;
  name: string;
  nameKo: string;
  color: string;
  region: string;
  description: string;
  characteristics: string[];
  productUrl: string;
}

const NILO_DATA: NiloEntry[] = [
  {
    id: 'zuni',
    name: '朱泥',
    nameKo: '주니',
    color: '#8B4513',
    region: '장쑤성 이싱 황룡산',
    description:
      '철분 함량이 높아 소성 후 선명한 붉은색을 띠는 니료입니다. 황룡산 산록에서 채취한 원토를 정제하여 사용하며, 밀도가 높고 기공이 미세해 차 맛을 부드럽게 변화시킵니다.',
    characteristics: ['소성 온도 1080–1120°C', '수축률 약 30%', '철분 함량 14–16%', '고급 홍차·우롱에 최적'],
    productUrl: '/products?clay=zuni',
  },
  {
    id: 'danni',
    name: '段泥',
    nameKo: '단니',
    color: '#C4A882',
    region: '장쑤성 이싱 청수진',
    description:
      '자사니와 녹니의 혼합으로 형성된 단니는 베이지·황토 계열의 색상이 특징입니다. 기공이 균일하여 열 전도율이 좋고, 오래 사용할수록 온화한 광택이 배어나옵니다.',
    characteristics: ['소성 온도 1100–1180°C', '수축률 약 12%', '기공률 5–8%', '녹차·백차에 최적'],
    productUrl: '/products?clay=danni',
  },
  {
    id: 'zani',
    name: '紫泥',
    nameKo: '자니',
    color: '#6B4226',
    region: '장쑤성 이싱 정산',
    description:
      '자사호의 가장 대표적인 니료로, 철과 망간 산화물이 조화롭게 함유되어 있습니다. 소성 후 자주빛 갈색을 띠며, 뛰어난 보온성과 투기성으로 중국차 전반에 두루 어울립니다.',
    characteristics: ['소성 온도 1150–1200°C', '수축률 약 10%', '내구성 최상', '보이차·암차에 최적'],
    productUrl: '/products?clay=zani',
  },
  {
    id: 'heini',
    name: '黑泥',
    nameKo: '흑니',
    color: '#2C2C2C',
    region: '장쑤성 이싱 용왕산',
    description:
      '산화망간과 철 성분이 풍부하여 소성 후 짙은 흑갈색을 띠는 희귀 니료입니다. 채취량이 적어 고가에 거래되며, 강한 흡착력으로 숙성 보이차의 향을 깊게 살려줍니다.',
    characteristics: ['소성 온도 1160–1220°C', '수축률 약 11%', '망간 함량 3–5%', '숙보이·흑차에 최적'],
    productUrl: '/products?clay=heini',
  },
  {
    id: 'qingshuini',
    name: '青水泥',
    nameKo: '청수니',
    color: '#7B9E87',
    region: '장쑤성 이싱 조장산',
    description:
      '철분이 낮고 규산 함량이 높은 청수니는 소성 후 회록색 혹은 청회색을 띱니다. 섬세한 질감과 낮은 흡수율로 깔끔한 차 맛을 유지해주며, 녹차와 궁합이 뛰어납니다.',
    characteristics: ['소성 온도 1120–1160°C', '수축률 약 8%', '규산 함량 65–70%', '녹차·화차에 최적'],
    productUrl: '/products?clay=qingshuini',
  },
  {
    id: 'luni',
    name: '綠泥',
    nameKo: '녹니',
    color: '#5B8A5F',
    region: '장쑤성 이싱 황용산 중층',
    description:
      '자니 광맥 중층에서만 발견되는 녹니는 생산량이 극히 적은 희귀 니료입니다. 소성 후 담록색을 띠며, 낮은 수축률 덕분에 정밀한 조형이 가능해 장인들이 선호합니다.',
    characteristics: ['소성 온도 1060–1080°C', '수축률 약 6%', '희귀성 최상급', '백차·황차에 최적'],
    productUrl: '/products?clay=luni',
  },
];

interface ProcessStep {
  id: string;
  step: number;
  title: string;
  description: string;
  detail: string;
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'chaeto',
    step: 1,
    title: '채토 (採土)',
    description: '산지에서 원토를 채굴',
    detail:
      '이싱 황룡산 일대의 채굴 허가 구역에서 숙련된 채토꾼이 직접 원토를 굴착합니다. 표층의 잡토를 걷어내고 2–5미터 깊이의 양질층에서만 채취하며, 계절에 따라 함수량이 달라지므로 채취 시점도 중요합니다.',
  },
  {
    id: 'yeonto',
    step: 2,
    title: '연토 (練土)',
    description: '원토 분쇄·정제·숙성',
    detail:
      '채취한 원토를 햇빛에 건조한 뒤 분쇄하고 수비(水飛) 과정을 거쳐 모래와 불순물을 제거합니다. 이후 습도가 일정한 지하 저장고에서 최소 6개월 이상 자연 숙성시켜 가소성과 점성을 높입니다.',
  },
  {
    id: 'seonghyeong',
    step: 3,
    title: '성형 (成形)',
    description: '타니·발피·접합으로 기형 완성',
    detail:
      '숙성된 니료를 알맞은 두께의 니편(泥片)으로 두드린 뒤, 대패로 밀어 균일한 두께를 만들고 형판에 맞게 성형합니다. 뚜껑·주구·손잡이 등 각 부위를 별도로 제작한 후 니장(泥漿)으로 접합하여 하나의 기형을 완성합니다.',
  },
  {
    id: 'soseong',
    step: 4,
    title: '소성 (燒成)',
    description: '1100°C 이상 가마 소성',
    detail:
      '성형한 호를 음건(陰乾)으로 서서히 건조한 후, 전통 용가마 혹은 현대 전기가마에서 니료에 따라 1060–1220°C로 소성합니다. 온도 곡선과 산화·환원 분위기를 정밀하게 조절하여 최종 색상과 질감을 결정합니다.',
  },
];

interface ArtistEntry {
  id: string;
  name: string;
  title: string;
  region: string;
  story: string;
  specialty: string;
  productUrl: string;
}

const ARTISTS: ArtistEntry[] = [
  {
    id: 'master-chen',
    name: '진위명 (陳偉明)',
    title: '국가급 공예미술사',
    region: '장쑤성 이싱',
    story:
      '30년 경력의 진위명 선생은 자니와 주니를 결합한 이중 니층 기법으로 독보적 위치를 굳혔습니다. "흙은 숨을 쉽니다. 장인은 그 숨결에 맞춰 손을 움직일 뿐입니다." 그의 작품은 전통 석표식(石瓢式)에 현대적 비례감을 더한 것이 특징입니다.',
    specialty: '이중 니층 석표식',
    productUrl: '/products?artist=chen-weiming',
  },
  {
    id: 'master-li',
    name: '이수향 (李秀香)',
    title: '성급 공예미술사',
    region: '장쑤성 이싱 청수진',
    story:
      '단니 전문가인 이수향 선생은 연꽃·대나무 등 자연 문양을 호(壺) 표면에 양각으로 새기는 화완형(花宛型) 기법을 계승하고 있습니다. 매 호마다 수개월의 정성을 기울이며 오직 소량만 제작합니다.',
    specialty: '단니 화완형',
    productUrl: '/products?artist=li-xiuxiang',
  },
];

// ─── 서브컴포넌트 ─────────────────────────────────────────────────

function SectionHeading({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <div className="mb-12 text-center">
      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{label}</span>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{title}</h2>
      {description && <p className="mt-3 max-w-xl mx-auto text-sm text-muted-foreground leading-relaxed">{description}</p>}
    </div>
  );
}

interface NiloCardProps {
  entry: NiloEntry;
  reversed?: boolean;
}

function NiloCard({ entry, reversed }: NiloCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-8 md:gap-12 md:items-center',
        reversed ? 'md:flex-row-reverse' : 'md:flex-row',
      )}
    >
      {/* 컬러 사각형 (이미지 플레이스홀더) */}
      <div
        className="w-full md:w-2/5 aspect-square rounded-lg shrink-0"
        style={{ backgroundColor: entry.color }}
        role="img"
        aria-label={`${entry.nameKo} 색상 샘플`}
      />

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="inline-block w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{entry.name}</span>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-1">{entry.nameKo}</h3>
        <p className="text-xs text-muted-foreground mb-4">산지: {entry.region}</p>
        <p className="text-sm text-foreground leading-relaxed mb-6">{entry.description}</p>
        <ul className="grid grid-cols-2 gap-2 mb-6">
          {entry.characteristics.map((c) => (
            <li key={c} className="text-xs text-muted-foreground border border-border rounded px-3 py-1.5">
              {c}
            </li>
          ))}
        </ul>
        <Link
          href={entry.productUrl}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground border border-foreground rounded px-4 py-2 hover:bg-foreground hover:text-background transition-colors"
        >
          이 니료의 작품 보기 →
        </Link>
      </div>
    </article>
  );
}

function ProcessCard({ step: s }: { step: ProcessStep }) {
  return (
    <article className="flex gap-6">
      <div className="shrink-0 flex flex-col items-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background text-sm font-bold">
          {s.step}
        </span>
        <div className="flex-1 w-px bg-border mt-2" aria-hidden="true" />
      </div>
      <div className="pb-10">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">{s.description}</p>
        <h3 className="text-xl font-bold text-foreground mb-3">{s.title}</h3>
        <p className="text-sm text-foreground leading-relaxed">{s.detail}</p>
      </div>
    </article>
  );
}

interface ArtistCardProps {
  artist: ArtistEntry;
  index: number;
  reversed?: boolean;
}

function ArtistCard({ artist, index, reversed }: ArtistCardProps) {
  const img = TEAPOT_IMAGES[index % TEAPOT_IMAGES.length];
  return (
    <article
      className={cn(
        'flex flex-col gap-8 md:gap-12 md:items-center',
        reversed ? 'md:flex-row-reverse' : 'md:flex-row',
      )}
    >
      {/* 작가 이미지 */}
      <div className="relative w-full md:w-2/5 aspect-square rounded-lg bg-muted shrink-0 overflow-hidden">
        <Image
          src={img.src}
          alt={`${artist.name} 작가 작품`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 40vw"
        />
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">{artist.title}</p>
        <h3 className="text-2xl font-bold text-foreground mb-1">{artist.name}</h3>
        <p className="text-xs text-muted-foreground mb-4">지역: {artist.region} · 전문: {artist.specialty}</p>
        <blockquote className="border-l-2 border-foreground pl-4 mb-6">
          <p className="text-sm text-foreground leading-relaxed italic">{artist.story}</p>
        </blockquote>
        <Link
          href={artist.productUrl}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground border border-foreground rounded px-4 py-2 hover:bg-foreground hover:text-background transition-colors"
        >
          이 작가의 다른 호 →
        </Link>
      </div>
    </article>
  );
}

// ─── 페이지 ───────────────────────────────────────────────────────

export default function ArchivePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-foreground text-background py-20 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-background/60 mb-3">Archive</p>
        <h1 className="text-4xl font-bold tracking-tight mb-4">니료 산지 기록 & 공정 스토리</h1>
        <p className="max-w-xl mx-auto text-sm text-background/70 leading-relaxed">
          자사호의 생명은 흙에서 시작됩니다. 산지별 니료의 특성, 채토부터 소성까지의 공정,
          그리고 흙과 함께 살아온 장인들의 이야기를 기록합니다.
        </p>
      </section>

      {/* 니료 사전 */}
      <section className="py-20 px-4 max-w-5xl mx-auto" aria-labelledby="nilo-heading">
        <SectionHeading
          label="니료 사전"
          title="흙의 종류와 산지"
          description="자사호에 사용되는 대표 니료 6종의 산지, 특성, 적합한 차종을 소개합니다."
        />
        <div className="space-y-20" id="nilo-heading">
          {NILO_DATA.map((entry, i) => (
            <NiloCard key={entry.id} entry={entry} reversed={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* 구분선 */}
      <hr className="border-border" />

      {/* 공정 기록 */}
      <section className="py-20 px-4 max-w-3xl mx-auto" aria-labelledby="process-heading">
        <SectionHeading
          label="공정 기록"
          title="채토에서 소성까지"
          description="자사호 한 점이 완성되기까지 거치는 네 단계의 공정을 기록합니다."
        />
        <div id="process-heading">
          {PROCESS_STEPS.map((s) => (
            <ProcessCard key={s.id} step={s} />
          ))}
        </div>
      </section>

      {/* 구분선 */}
      <hr className="border-border" />

      {/* 작가 인터뷰 */}
      <section className="py-20 px-4 max-w-5xl mx-auto" aria-labelledby="artist-heading">
        <SectionHeading
          label="작가 인터뷰"
          title="장인의 이야기"
          description="흙을 빚는 손끝에 담긴 삶의 기록을 소개합니다."
        />
        <div className="space-y-20" id="artist-heading">
          {ARTISTS.map((artist, i) => (
            <ArtistCard key={artist.id} artist={artist} index={i} reversed={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* CTA 푸터 */}
      <section className="bg-muted py-16 px-4 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Shop</p>
        <h2 className="text-2xl font-bold text-foreground mb-4">마음에 드는 니료의 작품을 만나보세요</h2>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium bg-foreground text-background rounded px-6 py-3 hover:opacity-80 transition-opacity"
        >
          전체 상품 보기 →
        </Link>
      </section>
    </div>
  );
}
