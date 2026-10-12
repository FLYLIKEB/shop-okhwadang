'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight, ChevronDown, Search, X } from 'lucide-react';
import { ADMIN_GUIDE_GROUPS, ADMIN_GUIDE_SCREENSHOTS, ADMIN_GUIDE_TOPICS } from '@/lib/admin-guide';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import CarouselArrowButton from '@/components/shared/common/CarouselArrowButton';

const STEP_KEYS = ['first', 'second', 'third'] as const;

type AdminGuideTopic = (typeof ADMIN_GUIDE_TOPICS)[number];
type AdminGuideTopicId = AdminGuideTopic['id'];
type GuideStepKey = (typeof STEP_KEYS)[number];
type GuideTranslator = (key: string, values?: Record<string, string | number>) => string;

function isTopicVisible(topic: AdminGuideTopic, role: string | undefined) {
  return !topic.superAdminOnly || role === 'super_admin';
}

function topicText(t: GuideTranslator, topic: AdminGuideTopic) {
  return [
    t(`topics.${topic.id}.title`),
    t(`topics.${topic.id}.summary`),
    ...STEP_KEYS.map((key) => t(`topics.${topic.id}.steps.${key}`)),
    t(`topics.${topic.id}.caution`),
  ].join(' ');
}

function matchingStepKey(t: GuideTranslator, topic: AdminGuideTopic, normalizedQuery: string) {
  if (!normalizedQuery) return undefined;
  return STEP_KEYS.find((key) =>
    t(`topics.${topic.id}.steps.${key}`).toLocaleLowerCase().includes(normalizedQuery),
  );
}

export function AdminGuideTopicContent({
  topic,
  initialStepKey,
}: {
  topic: AdminGuideTopic;
  initialStepKey?: GuideStepKey;
}) {
  const t = useTranslations('admin.guide');
  const [activeIndex, setActiveIndex] = useState(() =>
    initialStepKey ? STEP_KEYS.indexOf(initialStepKey) : 0,
  );
  const activeStepKey = STEP_KEYS[activeIndex];
  const title = t(`topics.${topic.id}.title`);
  const screenshotPath = ADMIN_GUIDE_SCREENSHOTS[topic.id]?.[activeStepKey];
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < STEP_KEYS.length - 1;

  useEffect(() => {
    if (!initialStepKey) return;
    setActiveIndex(STEP_KEYS.indexOf(initialStepKey));
  }, [initialStepKey, topic.id]);

  const goPrevious = () => setActiveIndex((index) => Math.max(index - 1, 0));
  const goNext = () => setActiveIndex((index) => Math.min(index + 1, STEP_KEYS.length - 1));

  return (
    <div className="space-y-4">
      <p className="typo-body-sm text-muted-foreground">{t(`topics.${topic.id}.summary`)}</p>
      <div
        role="group"
        aria-label={title}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goPrevious();
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            goNext();
          }
        }}
        className="space-y-3 rounded-lg border border-soft bg-muted/30 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {screenshotPath && (
          <figure className="space-y-2">
            <a
              href={screenshotPath}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('viewScreenshot')}
              className="block overflow-hidden rounded-md border border-soft bg-background"
            >
              <Image
                src={screenshotPath}
                alt={t('screenshotAlt', { title })}
                width={1280}
                height={800}
                sizes="(min-width: 1024px) 768px, 100vw"
                className="h-auto w-full"
                loading="lazy"
              />
            </a>
            <figcaption className="flex flex-col gap-2 typo-label text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>{t('sampleScreenshot')}</span>
              <a
                href={screenshotPath}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground transition-colors hover:text-primary"
              >
                {t('viewScreenshot')}
              </a>
            </figcaption>
          </figure>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p role="status" aria-live="polite" className="typo-label font-body font-semibold text-muted-foreground">
              {t('slideStatus', { current: activeIndex + 1, total: STEP_KEYS.length })}
            </p>
            <p className="mt-1 typo-body-sm text-foreground">
              {t(`topics.${topic.id}.steps.${activeStepKey}`)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <CarouselArrowButton
              direction="left"
              onClick={goPrevious}
              ariaLabel={t('previousSlide')}
              disabled={!canGoPrevious}
              className="h-11 min-h-11 w-11"
            />
            <div className="flex items-center gap-1" aria-hidden="true">
              {STEP_KEYS.map((stepKey, index) => (
                <span
                  key={stepKey}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex ? 'w-5 bg-foreground' : 'w-1.5 bg-border'
                  }`}
                />
              ))}
            </div>
            <CarouselArrowButton
              direction="right"
              onClick={goNext}
              ariaLabel={t('nextSlide')}
              disabled={!canGoNext}
              className="h-11 min-h-11 w-11"
            />
          </div>
        </div>
      </div>
      <div className="rounded-lg bg-muted px-4 py-3">
        <h3 className="typo-label font-body font-semibold text-muted-foreground">{t('cautionTitle')}</h3>
        <p className="mt-1 typo-body-sm text-foreground">{t(`topics.${topic.id}.caution`)}</p>
      </div>
    </div>
  );
}

export function AdminGuide() {
  const t = useTranslations('admin.guide');
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [openTopicIds, setOpenTopicIds] = useState<Set<AdminGuideTopicId>>(new Set());

  const visibleTopics = useMemo(
    () => ADMIN_GUIDE_TOPICS.filter((topic) => isTopicVisible(topic, user?.role)),
    [user?.role],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredTopics = useMemo(() => {
    if (!normalizedQuery) return visibleTopics;
    return visibleTopics.filter((topic) =>
      topicText(t, topic).toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, t, visibleTopics]);

  useEffect(() => {
    const openHashTopic = () => {
      const id = window.location.hash.replace('#', '') as AdminGuideTopicId;
      if (!id || !visibleTopics.some((topic) => topic.id === id)) return;
      setQuery('');
      setOpenTopicIds((prev) => new Set(prev).add(id));
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
      }, 0);
    };

    openHashTopic();
    window.addEventListener('hashchange', openHashTopic);
    return () => window.removeEventListener('hashchange', openHashTopic);
  }, [visibleTopics]);

  const toggleTopic = (id: AdminGuideTopicId, open: boolean) => {
    setOpenTopicIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <div className="relative">
          <FormInput
            id="admin-guide-search"
            type="search"
            label={t('searchLabel')}
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              const nextNormalizedQuery = nextQuery.trim().toLocaleLowerCase();
              if (!nextNormalizedQuery) return;
              setOpenTopicIds(
                new Set(
                  visibleTopics
                    .filter((topic) => topicText(t, topic).toLocaleLowerCase().includes(nextNormalizedQuery))
                    .map((topic) => topic.id),
                ),
              );
            }}
            className="pl-10"
          />
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      {filteredTopics.length === 0 ? (
        <div className="rounded-lg border border-soft bg-background p-6">
          <p className="typo-body-sm text-muted-foreground">{t('noResults')}</p>
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
              {t('clearSearch')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {ADMIN_GUIDE_GROUPS.map((group) => {
            const groupTopics = filteredTopics.filter((topic) => topic.group === group);
            if (groupTopics.length === 0) return null;

            return (
              <section key={group} className="space-y-3" aria-labelledby={`admin-guide-${group}`}>
                <h2 id={`admin-guide-${group}`} className="typo-h3 font-body font-semibold text-foreground">
                  {t(`groups.${group}`)}
                </h2>
                <div className="space-y-2">
                  {groupTopics.map((topic) => {
                    const isOpen = openTopicIds.has(topic.id);
                    const initialStepKey = matchingStepKey(t, topic, normalizedQuery);
                    return (
                      <details
                        key={topic.id}
                        id={topic.id}
                        open={isOpen}
                        className="group rounded-lg border border-soft bg-background"
                      >
                        <summary
                          onClick={(event) => {
                            event.preventDefault();
                            toggleTopic(topic.id, !isOpen);
                          }}
                          className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="min-w-0">
                            <span className="block typo-body-sm font-semibold text-foreground">
                              {t(`topics.${topic.id}.title`)}
                            </span>
                            <span className="block truncate typo-body-sm text-muted-foreground">
                              {t(`topics.${topic.id}.summary`)}
                            </span>
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <div className="space-y-4 border-t border-soft px-4 py-4">
                          {isOpen && (
                            <>
                              <AdminGuideTopicContent
                                key={`${topic.id}:${normalizedQuery}`}
                                topic={topic}
                                initialStepKey={initialStepKey}
                              />
                              <Button asChild variant="ghost" size="sm">
                                <Link href={topic.href}>
                                  {t('openScreen')}
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            </>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminContextGuide({ topic }: { topic: AdminGuideTopic }) {
  const t = useTranslations('admin.guide');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      open={isOpen}
      className="admin-guide group rounded-lg border border-soft bg-background"
    >
      <summary
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((open) => !open);
        }}
        className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0">
          <span className="block typo-body-sm font-semibold text-foreground">{t('contextTitle')}</span>
          <span className="block truncate typo-body-sm text-muted-foreground">
            {t(`topics.${topic.id}.title`)}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-soft px-4 py-4">
        <div className="max-w-3xl space-y-4">
          {isOpen && (
            <>
              <AdminGuideTopicContent topic={topic} />
              <Link
                href={`/admin/guide#${topic.id}`}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-3 typo-button text-primary transition-colors hover:bg-muted"
              >
                {t('allGuides')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </details>
  );
}
