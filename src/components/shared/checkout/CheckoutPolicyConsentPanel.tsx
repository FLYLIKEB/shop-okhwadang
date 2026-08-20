'use client';

import { ChevronDown } from 'lucide-react';
import SafeHtml from '@/components/shared/common/SafeHtml';
import { cn } from '@/components/ui/utils';
import type { CurrentPolicyMetadata, Page } from '@/lib/api';

type CheckoutPolicyConsentPanelProps = {
  policies: CurrentPolicyMetadata[];
  isExpanded: boolean;
  selectedPolicySlug: string | null;
  policyPages: Record<string, Page>;
  loadingPolicySlug: string | null;
  onToggleList: () => void;
  onTogglePolicy: (slug: string) => void;
  labels: {
    title: string;
    showPolicy: string;
    hidePolicy: string;
    openPolicy: string;
    closePolicy: string;
    required: string;
    scrollRegion: string;
    contentLoading: string;
    contentUnavailable: string;
    effectiveDate: string;
  };
};

function getPolicyHtml(page: Page | undefined): string | null {
  const block = page?.blocks.find((candidate) => candidate.type === 'text_content');
  const html = block?.content.html;
  return typeof html === 'string' ? html : null;
}

export function CheckoutPolicyConsentPanel({
  policies,
  isExpanded,
  selectedPolicySlug,
  policyPages,
  loadingPolicySlug,
  onToggleList,
  onTogglePolicy,
  labels,
}: CheckoutPolicyConsentPanelProps) {
  return (
    <div className="checkout-toss-policy overflow-hidden rounded-md bg-muted/20 text-foreground">
      <button
        type="button"
        onClick={onToggleList}
        aria-expanded={isExpanded}
        aria-controls="checkout-policy-list"
        aria-label={isExpanded ? labels.hidePolicy : labels.showPolicy}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <span className="typo-body-sm font-semibold">{labels.title}</span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
      </button>

      {isExpanded && (
        <div id="checkout-policy-list" className="divide-y divide-soft border-t border-soft">
          {policies.map((policy) => {
            const isPolicyOpen = selectedPolicySlug === policy.slug;
            const policyHtml = getPolicyHtml(policyPages[policy.slug]);
            const policyBodyId = `checkout-policy-body-${policy.slug}`;

            return (
              <article key={policy.slug} className="bg-background/60">
                <button
                  type="button"
                  onClick={() => onTogglePolicy(policy.slug)}
                  aria-expanded={isPolicyOpen}
                  aria-controls={policyBodyId}
                  aria-label={`${policy.title} ${isPolicyOpen ? labels.closePolicy : labels.openPolicy}`}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span className="min-w-0">
                    <span className="block typo-body-sm font-medium">{policy.title}</span>
                    <span className="mt-1 block typo-label text-muted-foreground">
                      {labels.required} · {policy.version} · {labels.effectiveDate}: {policy.effectiveDate}
                    </span>
                  </span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isPolicyOpen && 'rotate-180')} />
                </button>

                {isPolicyOpen && (
                  <div id={policyBodyId} className="px-4 pb-4">
                    {loadingPolicySlug === policy.slug ? (
                      <p className="rounded-md bg-muted/30 p-4 typo-body-sm text-muted-foreground">
                        {labels.contentLoading}
                      </p>
                    ) : policyHtml ? (
                      <div
                        className="checkout-policy-scroll max-h-80 overflow-y-auto rounded-md border border-soft bg-background p-4 md:max-h-96"
                        role="region"
                        tabIndex={0}
                        aria-label={`${policy.title} ${labels.scrollRegion}`}
                      >
                        <SafeHtml
                          html={policyHtml}
                          className="prose max-w-none typo-body-sm [&_p]:mb-3 [&_p:last-child]:mb-0"
                        />
                      </div>
                    ) : (
                      <p className="rounded-md bg-muted/30 p-4 typo-body-sm text-muted-foreground">
                        {labels.contentUnavailable}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
