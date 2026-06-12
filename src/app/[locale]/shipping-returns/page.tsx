import { useTranslations } from 'next-intl'

interface PolicySection {
  title: string
  body: string
}

export default function ShippingReturnsPage() {
  const t = useTranslations('shippingReturnsPage')
  const sectionKeys = t.raw('sectionKeys') as string[]

  return (
    <main className="layout-container layout-page max-w-4xl">
      <div className="mb-10 border-b border-border pb-6">
        <p className="typo-label text-muted-foreground">{t('eyebrow')}</p>
        <h1 className="typo-h1 mt-2 text-foreground">{t('title')}</h1>
        <p className="typo-body mt-4 text-muted-foreground">{t('description')}</p>
        <p className="typo-body-sm mt-3 text-muted-foreground">{t('effectiveDate')}</p>
      </div>

      <div className="space-y-8">
        {sectionKeys.map((key) => {
          const section = t.raw(`sections.${key}`) as PolicySection
          return (
            <section key={key} className="rounded-lg border border-border bg-card p-5">
              <h2 className="typo-h2 text-foreground">{section.title}</h2>
              <p className="typo-body mt-3 whitespace-pre-line text-muted-foreground">{section.body}</p>
            </section>
          )
        })}
      </div>
    </main>
  )
}
