'use client';

export default function ErrorPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="text-xl font-semibold">안내 바 페이지를 불러오지 못했습니다.</h2>
      <p className="mt-2 text-sm text-muted-foreground">잠시 후 다시 시도해주세요.</p>
    </div>
  );
}
