import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <h2 className="text-xl font-semibold text-foreground">상품을 찾을 수 없습니다.</h2>
      <p className="text-sm text-muted-foreground">요청하신 상품이 존재하지 않거나 삭제되었습니다.</p>
      <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
        홈으로
      </Link>
    </div>
  )
}
