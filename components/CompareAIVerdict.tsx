'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { generateCompareVerdict, type CompareVerdict } from '@/lib/actions/compare-verdict.actions';
import { cn } from '@/lib/utils';

type CompareAIVerdictProps = {
    symbols: string[];
};

export default function CompareAIVerdict({ symbols }: CompareAIVerdictProps) {
    const [isPending, startTransition] = useTransition();
    const [verdict, setVerdict] = useState<CompareVerdict | null>(null);
    const [used, setUsed] = useState<'gemini' | 'heuristic' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canGenerate = symbols.length >= 2;

    const run = () => {
        if (!canGenerate) return;

        startTransition(async () => {
            setError(null);
            const result = await generateCompareVerdict(symbols);
            if (!result.ok) {
                setVerdict(null);
                setUsed(null);
                setError(result.error);
                return;
            }

            setVerdict(result.verdict);
            setUsed(result.used);
        });
    };

    useEffect(() => {
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbols.join(',')]);

    return (
        <div className='rounded-xl border border-yellow-500/15 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_rgba(17,24,39,0.95)_45%)] p-5 shadow-[0_0_0_1px_rgba(234,179,8,0.05)]'>
            <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <div>
                    <div className='flex flex-wrap items-center gap-2'>
                        <h2 className='text-lg font-semibold text-gray-100'>AI Verdict</h2>
                        {used ? (
                            <span className='rounded-full border border-gray-600 bg-gray-900/70 px-2 py-0.5 text-xs text-gray-400'>
                                {used === 'gemini' ? 'Gemini' : 'Fallback'}
                            </span>
                        ) : null}
                        {verdict?.confidenceLabel ? (
                            <span className='rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-200'>
                                {verdict.confidenceLabel}
                            </span>
                        ) : null}
                    </div>
                    <p className='text-sm text-gray-500'>
                        A polished comparison readout based on the metrics you&apos;re comparing.
                    </p>
                </div>
                <Button
                    type='button'
                    className='yellow-btn h-10 px-4'
                    disabled={!canGenerate || isPending}
                    onClick={run}
                >
                    {isPending ? 'Generating...' : 'Regenerate'}
                </Button>
            </div>

            {error ? (
                <div className='mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>
                    {error}
                </div>
            ) : null}

            {!verdict && !error ? (
                <div className='mt-4 rounded-md border border-gray-700 bg-gray-900/30 p-4 text-sm text-gray-400'>
                    {canGenerate ? 'Generating verdict...' : 'Pick at least 2 stocks to generate a verdict.'}
                </div>
            ) : null}

            {verdict ? (
                <div className='mt-5 space-y-4'>
                    <div className='rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/12 via-yellow-500/4 to-transparent p-4'>
                        <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
                            <div className='max-w-2xl'>
                                <div className='text-xs uppercase tracking-[0.25em] text-yellow-300/80'>Winner spotlight</div>
                                <h3 className='mt-2 text-xl font-semibold text-yellow-100'>{verdict.title}</h3>
                                <p className='mt-2 text-sm text-gray-300'>{verdict.summary}</p>
                                <p className='mt-3 text-sm font-medium text-yellow-100/90'>{verdict.winnerReason}</p>
                            </div>
                            {verdict.winnerSymbol ? (
                                <div className='rounded-2xl border border-yellow-500/20 bg-black/20 px-4 py-3 text-right'>
                                    <div className='text-xs uppercase tracking-[0.2em] text-gray-500'>Leading symbol</div>
                                    <div className='mt-1 text-3xl font-semibold text-yellow-200'>{verdict.winnerSymbol}</div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {verdict.scorecard?.length ? (
                        <div className='grid gap-3 lg:grid-cols-3'>
                            {verdict.scorecard.map((entry) => (
                                <div
                                    key={entry.symbol}
                                    className={cn(
                                        'rounded-xl border p-4 transition-colors',
                                        entry.symbol === verdict.winnerSymbol
                                            ? 'border-yellow-500/30 bg-yellow-500/8'
                                            : 'border-gray-700 bg-gray-900/20'
                                    )}
                                >
                                    <div className='flex items-start justify-between gap-3'>
                                        <div>
                                            <div className='text-lg font-semibold text-gray-100'>{entry.symbol}</div>
                                            <div className='mt-1 text-xs uppercase tracking-[0.2em] text-gray-500'>
                                                Overall score
                                            </div>
                                        </div>
                                        <div className='text-2xl font-semibold text-yellow-200'>{entry.overall}</div>
                                    </div>

                                    <div className='mt-4 space-y-3 text-sm'>
                                        <div className='flex items-center justify-between text-gray-300'>
                                            <span>Momentum</span>
                                            <span>{entry.momentum}</span>
                                        </div>
                                        <div className='flex items-center justify-between text-gray-300'>
                                            <span>Valuation</span>
                                            <span>{entry.valuation}</span>
                                        </div>
                                        <div className='flex items-center justify-between text-gray-300'>
                                            <span>Stability</span>
                                            <span>{entry.stability}</span>
                                        </div>
                                    </div>

                                    <div className='mt-4 rounded-lg border border-gray-700/70 bg-black/20 p-3'>
                                        <p className='text-xs uppercase tracking-[0.2em] text-gray-500'>Best for</p>
                                        <p className='mt-1 text-sm text-gray-200'>{entry.bestFor}</p>
                                        <p className='mt-3 text-xs uppercase tracking-[0.2em] text-gray-500'>Watch out</p>
                                        <p className='mt-1 text-sm text-gray-400'>{entry.caution}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {verdict.keyTakeaways?.length ? (
                        <ul className='space-y-2 text-sm text-gray-300'>
                            {verdict.keyTakeaways.slice(0, 5).map((item, idx) => (
                                <li key={idx} className='flex gap-2'>
                                    <span className='mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-yellow-400' />
                                    <span className='min-w-0'>{item}</span>
                                </li>
                            ))}
                        </ul>
                    ) : null}

                    {verdict.perStock?.length ? (
                        <div className='grid gap-3 md:grid-cols-2'>
                            {verdict.perStock.map((stock) => (
                                <div key={stock.symbol} className='rounded-xl border border-gray-700 bg-gray-900/20 p-4'>
                                    <div className='flex items-center justify-between'>
                                        <h4 className='font-semibold text-gray-100'>{stock.symbol}</h4>
                                    </div>
                                    <div className='mt-3 grid gap-3 text-sm'>
                                        <div>
                                            <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Pros</p>
                                            <ul className='mt-2 space-y-1 text-gray-300'>
                                                {stock.pros?.slice(0, 3).map((item, idx) => (
                                                    <li key={idx} className='flex gap-2'>
                                                        <span className='text-teal-400'>+</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Cons</p>
                                            <ul className='mt-2 space-y-1 text-gray-300'>
                                                {stock.cons?.slice(0, 3).map((item, idx) => (
                                                    <li key={idx} className='flex gap-2'>
                                                        <span className='text-red-400'>-</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <p className={cn('text-xs text-gray-500', used === 'heuristic' ? 'italic' : undefined)}>
                        {verdict.disclaimer}
                    </p>
                </div>
            ) : null}
        </div>
    );
}
