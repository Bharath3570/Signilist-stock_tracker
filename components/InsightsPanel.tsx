'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { regenerateDailyInsights, type InsightPayload } from '@/lib/actions/insights.actions';
import { cn } from '@/lib/utils';

type Props = {
    initial: InsightPayload;
    used: 'gemini' | 'heuristic';
    cached: boolean;
};

const toneColor = (tone: InsightPayload['overallTrend']) => {
    if (tone === 'bullish') return 'text-teal-300';
    if (tone === 'bearish') return 'text-red-400';
    return 'text-yellow-200';
};

export default function InsightsPanel({ initial, used: initialUsed, cached: initialCached }: Props) {
    const [isPending, startTransition] = useTransition();
    const [payload, setPayload] = useState(initial);
    const [used, setUsed] = useState<'gemini' | 'heuristic'>(initialUsed);
    const [cached, setCached] = useState(initialCached);

    const regenerate = () => {
        startTransition(async () => {
            const res = await regenerateDailyInsights();
            if (!res.ok) return;
            setPayload(res.payload);
            setUsed(res.used);
            setCached(res.cached);
        });
    };

    const avg = payload.watchlistSnapshot.avgChangePercent;

    return (
        <div className='space-y-5'>
            <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
                <div>
                    <div className='flex flex-wrap items-center gap-2'>
                        <h1 className='watchlist-title'>AI Insights</h1>
                        <span className='rounded-full border border-gray-700 bg-gray-900/60 px-2 py-0.5 text-xs text-gray-400'>
                            {payload.dateKey}
                        </span>
                        <span className='rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-200'>
                            {used === 'gemini' ? 'Gemini' : 'Fallback'}
                        </span>
                        {cached ? (
                            <span className='rounded-full border border-gray-700 bg-gray-900/60 px-2 py-0.5 text-xs text-gray-400'>
                                Cached
                            </span>
                        ) : null}
                    </div>
                    <p className='mt-2 text-sm text-gray-400'>{payload.subheading}</p>
                </div>

                <Button
                    type='button'
                    className='yellow-btn h-10 px-4'
                    disabled={isPending}
                    onClick={regenerate}
                >
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {isPending ? 'Regenerating...' : 'Regenerate'}
                </Button>
            </div>

            <div className='rounded-xl border border-yellow-500/15 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.07),_rgba(17,24,39,0.95)_50%)] p-5'>
                <div className='text-xs uppercase tracking-[0.25em] text-yellow-300/80'>Today&apos;s watchlist brief</div>
                <h2 className='mt-2 text-2xl font-semibold text-gray-100'>{payload.title}</h2>

                <div className='mt-4 grid gap-3 lg:grid-cols-3'>
                    <div className='rounded-xl border border-gray-700 bg-gray-900/30 p-4'>
                        <div className='text-xs uppercase tracking-[0.2em] text-gray-500'>Overall tone</div>
                        <div className={cn('mt-2 text-xl font-semibold capitalize', toneColor(payload.overallTrend))}>
                            {payload.overallTrend}
                        </div>
                        <div className='mt-2 text-sm text-gray-400'>
                            {typeof avg === 'number' ? `${avg > 0 ? '+' : ''}${avg}% avg` : 'Avg change unavailable'}
                        </div>
                    </div>

                    <div className='rounded-xl border border-gray-700 bg-gray-900/30 p-4'>
                        <div className='text-xs uppercase tracking-[0.2em] text-gray-500'>Top gainer</div>
                        {payload.topGainer ? (
                            <div className='mt-2'>
                                <div className='flex items-center justify-between gap-3'>
                                    <div className='text-lg font-semibold text-gray-100'>{payload.topGainer.symbol}</div>
                                    <div className='inline-flex items-center gap-2 text-sm font-semibold text-teal-300'>
                                        <TrendingUp className='h-4 w-4' />
                                        {payload.topGainer.changeFormatted}
                                    </div>
                                </div>
                                <div className='mt-1 text-sm text-gray-400'>{payload.topGainer.company}</div>
                                <div className='mt-1 text-sm text-gray-300'>{payload.topGainer.reason}</div>
                                <div className='mt-2'>
                                    <Link
                                        href={`/stocks/${encodeURIComponent(payload.topGainer.symbol)}`}
                                        className='text-sm text-yellow-300 hover:text-yellow-200'
                                    >
                                        Open stock →
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className='mt-2 text-sm text-gray-500'>Not enough data</div>
                        )}
                    </div>

                    <div className='rounded-xl border border-gray-700 bg-gray-900/30 p-4'>
                        <div className='text-xs uppercase tracking-[0.2em] text-gray-500'>Top loser</div>
                        {payload.topLoser ? (
                            <div className='mt-2'>
                                <div className='flex items-center justify-between gap-3'>
                                    <div className='text-lg font-semibold text-gray-100'>{payload.topLoser.symbol}</div>
                                    <div className='inline-flex items-center gap-2 text-sm font-semibold text-red-400'>
                                        <TrendingDown className='h-4 w-4' />
                                        {payload.topLoser.changeFormatted}
                                    </div>
                                </div>
                                <div className='mt-1 text-sm text-gray-400'>{payload.topLoser.company}</div>
                                <div className='mt-1 text-sm text-gray-300'>{payload.topLoser.reason}</div>
                                <div className='mt-2'>
                                    <Link
                                        href={`/stocks/${encodeURIComponent(payload.topLoser.symbol)}`}
                                        className='text-sm text-yellow-300 hover:text-yellow-200'
                                    >
                                        Open stock →
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className='mt-2 text-sm text-gray-500'>Not enough data</div>
                        )}
                    </div>
                </div>

                {payload.keyTakeaways?.length ? (
                    <div className='mt-5 rounded-xl border border-gray-700 bg-gray-950/20 p-4'>
                        <div className='text-xs uppercase tracking-[0.2em] text-gray-500'>Key takeaways</div>
                        <ul className='mt-3 space-y-2 text-sm text-gray-300'>
                    {payload.keyTakeaways.slice(0, 6).map((item, idx) => (
                        <li key={idx} className='flex gap-2'>
                            <span className='mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-yellow-400' />
                            <span className='min-w-0'>{item}</span>
                        </li>
                    ))}
                        </ul>
                    </div>
                ) : null}

                {payload.newsHighlights?.length ? (
                    <div className='mt-5 grid gap-3 lg:grid-cols-2'>
                        {payload.newsHighlights.slice(0, 4).map((item, idx) => (
                            <div key={`${item.headline}-${idx}`} className='rounded-xl border border-gray-700 bg-gray-900/20 p-4'>
                                <div className='flex items-start justify-between gap-3'>
                                    <div className='min-w-0'>
                                        <div className='text-xs uppercase tracking-[0.2em] text-gray-500'>{item.source}</div>
                                        <div className='mt-1 truncate text-base font-semibold text-gray-100'>{item.headline}</div>
                                        <div className='mt-2 text-sm text-gray-300'>{item.takeaway}</div>
                                    </div>
                                    {item.symbol ? (
                                        <span className='shrink-0 rounded-full border border-gray-700 bg-gray-900 px-2 py-0.5 text-xs text-gray-300'>
                                            {item.symbol}
                                        </span>
                                    ) : null}
                                </div>
                                {item.url ? (
                                    <a
                                        href={item.url}
                                        target='_blank'
                                        rel='noreferrer'
                                        className='mt-3 inline-flex text-sm text-yellow-300 hover:text-yellow-200'
                                    >
                                        Read source →
                                    </a>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}

                <p className='mt-5 text-xs text-gray-500'>{payload.disclaimer}</p>
            </div>
        </div>
    );
}
