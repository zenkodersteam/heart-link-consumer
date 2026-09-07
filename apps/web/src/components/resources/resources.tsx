'use client';

import type { ResourceItem } from '@heartlink/consumer-api';
import {
  RESOURCE_CATEGORIES,
  type ResourceCategoryKey,
} from '@heartlink/consumer-content';
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Flower2,
  Headphones,
  Heart,
  Landmark,
  Phone,
  Search,
  Sprout,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useResources } from '@/lib/queries';
import { cn } from '@/lib/utils';

/**
 * Resources & Support, following the client screen: serif hero over a pill
 * search, category chips, four icon-badge cards, and a support band.
 *
 * Two levels. The landing shows the four categories; choosing one — or typing
 * anything — swaps in the live directory from `/api/resources` for that filter.
 * The category headings come from `@heartlink/consumer-content`, so the phone
 * app promises the same four things in the same words.
 */

/** Per-category iconography, the one part of a category the web owns. */
const CATEGORY_VISUALS: Record<
  ResourceCategoryKey,
  { icon: LucideIcon; badge: string; tint: string }
> = {
  awareness: { icon: Landmark, badge: 'bg-[#EDE6FA]', tint: 'text-[#6D4AA8]' },
  reentry: { icon: Sprout, badge: 'bg-[#FBEBD8]', tint: 'text-[#C07C2E]' },
  mental: { icon: Flower2, badge: 'bg-[#EDE6FA]', tint: 'text-[#6D4AA8]' },
  community: { icon: Users, badge: 'bg-[#FBE1E8]', tint: 'text-[#D14C77]' },
};

export function Resources() {
  const [active, setActive] = useState<ResourceCategoryKey | 'all'>('all');
  const [search, setSearch] = useState('');

  // Debounced: querying on every keystroke cancels the request in flight and
  // leaves the list spinning while someone is still typing.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const activeCategory = RESOURCE_CATEGORIES.find((c) => c.key === active) ?? null;
  const showCategoryCards = active === 'all' && debounced.length === 0;

  const { data, isPending, isError, refetch } = useResources(
    showCategoryCards
      ? {}
      : { categorySlug: activeCategory?.slug, q: debounced || undefined },
  );

  const items = data?.items ?? [];

  const directory = (
    <div className="mt-6">
      {isPending ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="rounded-[--radius-card] border border-line bg-surface-elevated p-8 text-center">
          <p className="text-sm text-ink-soft">We could not load these resources.</p>
          <Button className="mt-4" variant="secondary" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-faint">
          No resources match{debounced ? ` “${debounced}”` : ''}.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <OrgCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      {activeCategory ? (
        <>
          <nav className="mb-5 text-[13px]" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={() => {
                setActive('all');
                setSearch('');
              }}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              All Resources
            </button>
            <ChevronRight className="mx-1 inline size-3 text-ink-faint" aria-hidden />
            <span className="font-semibold text-ink">{activeCategory.title}</span>
          </nav>

          <header className="mb-5">
            <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">
              {activeCategory.title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {activeCategory.blurb}
            </p>
          </header>

          <SearchPill
            value={search}
            onChange={setSearch}
            placeholder={`Search ${activeCategory.title}`}
          />

          {directory}
        </>
      ) : (
        <>
          <header className="text-center">
            <h1 className="inline-flex items-center gap-2 font-[family-name:var(--font-bree)] text-[32px] leading-tight text-ink">
              Resources &amp; Support
              <Heart className="size-5 text-primary" aria-hidden />
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
              Information, guidance, and support for every step of the journey.
            </p>
          </header>

          <div className="mt-6">
            <SearchPill
              value={search}
              onChange={setSearch}
              placeholder="Search resources, topics, or organizations…"
            />
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Chip label="All Resources" active onSelect={() => setActive('all')} />
            {RESOURCE_CATEGORIES.map((c) => (
              <Chip key={c.key} label={c.title} onSelect={() => setActive(c.key)} />
            ))}
          </div>

          {debounced.length > 0 ? (
            directory
          ) : (
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              {RESOURCE_CATEGORIES.map((category) => (
                <CategoryCard
                  key={category.key}
                  category={category}
                  onSelect={() => setActive(category.key)}
                />
              ))}
            </div>
          )}

          <section className="mt-8 flex flex-col items-center gap-4 rounded-[--radius-card] border border-line bg-surface-elevated p-6 text-center sm:flex-row sm:text-left">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-faint">
              <Headphones className="size-6 text-primary" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-[family-name:var(--font-bree)] text-lg text-ink">
                Need personalized support?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Our support team is here to help you find the right resources for your unique
                situation.
              </p>
            </div>
            <div className="shrink-0 text-center">
              <Button asChild>
                <Link href="/support">Contact Support</Link>
              </Button>
              <p className="mt-2 text-[12px] text-ink-faint">
                We typically respond within 24 hours
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SearchPill({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-[17px] -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        className="h-12 w-full rounded-[--radius-pill] border border-line bg-surface-elevated pl-11 pr-11 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-surface-muted text-ink-soft transition-colors hover:bg-line"
        >
          <X className="size-3" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function Chip({
  label,
  active,
  onSelect,
}: {
  label: string;
  active?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'rounded-[--radius-pill] border px-3.5 py-2 text-[13px] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active
          ? 'border-primary bg-primary-faint font-semibold text-primary'
          : 'border-line bg-surface-elevated text-ink hover:border-primary',
      )}
    >
      {label}
    </button>
  );
}

function CategoryCard({
  category,
  onSelect,
}: {
  category: (typeof RESOURCE_CATEGORIES)[number];
  onSelect: () => void;
}) {
  const { icon: Icon, badge, tint } = CATEGORY_VISUALS[category.key];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex h-full flex-col rounded-[--radius-card] border border-line bg-surface-elevated p-5 text-left transition-shadow hover:shadow-[0_12px_32px_rgba(46,18,64,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="flex items-start gap-3.5">
        <span className={cn('grid size-14 shrink-0 place-items-center rounded-full', badge)}>
          <Icon className={cn('size-6', tint)} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="inline-flex items-center gap-1.5 font-[family-name:var(--font-bree)] text-lg text-ink">
            {category.title}
            <Heart className="size-3.5 text-gold" aria-hidden />
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{category.blurb}</p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {category.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-[--radius-pill] bg-surface-muted px-2.5 py-1 text-[11.5px] text-ink-soft"
          >
            {tag}
          </span>
        ))}
      </div>

      <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
        View Resources
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </button>
  );
}

/** One directory entry. Links out where there is somewhere to go. */
function OrgCard({ item }: { item: ResourceItem }) {
  const href = item.url ?? (item.phone ? `tel:${item.phone.replace(/[^0-9+]/g, '')}` : null);

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{item.title}</h3>
          {item.organization ? (
            <p className="text-[13px] text-ink-faint">{item.organization}</p>
          ) : null}
        </div>
        {item.url ? (
          <ExternalLink className="size-4 shrink-0 text-ink-faint" aria-hidden />
        ) : item.phone ? (
          <Phone className="size-4 shrink-0 text-ink-faint" aria-hidden />
        ) : null}
      </div>

      {item.description ? (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{item.description}</p>
      ) : null}

      {item.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[--radius-pill] bg-surface-muted px-2.5 py-1 text-[11.5px] text-ink-soft"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );

  const shell =
    'block rounded-[14px] border border-line bg-surface-elevated p-4 transition-shadow';

  return href ? (
    <a
      href={href}
      target={item.url ? '_blank' : undefined}
      rel={item.url ? 'noopener noreferrer' : undefined}
      className={cn(shell, 'hover:shadow-[0_10px_26px_rgba(46,18,64,0.08)]')}
    >
      {body}
    </a>
  ) : (
    <div className={shell}>{body}</div>
  );
}
