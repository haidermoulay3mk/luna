// Built with help from Claude (Anthropic).
// DataTag (LUNA_BUILD A2.3): a small mono chip that says honestly where a number comes from,
// e.g. "NASA DONKI · LIVE" or "NASA DONKI · SAVED 14 NOV". Stored data is never called live.
import type { ReactNode } from 'react';

/** "14 NOV" from an ISO date (UTC, so it matches the saved file on any computer). */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'UNKNOWN DATE';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).toUpperCase();
}

/** The honest tag text for a data source: LIVE only when it was fetched live just now. */
export function dataTagText(source: string, status: 'live' | 'saved' | 'archived' | 'loading', fetchedAt: string): string {
  if (status === 'live') return `${source} · LIVE`;
  if (status === 'loading') return `${source} · CHECKING`;
  return `${source} · SAVED ${shortDate(fetchedAt)}`;
}

export function DataTag({ children, live = false, className = '' }: { children: ReactNode; live?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border border-line px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft ${className}`}>
      {/* A filled dot means live, a hollow ring means saved: shape, not only colour. */}
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-ok' : 'border border-ink-faint'}`} />
      {children}
    </span>
  );
}
