import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type SummaryCard = {
    title: string;
    company: string;
    symbol: string;
    value: string;
    tone: 'positive' | 'negative' | 'neutral';
    detail: string;
};

const toneClassMap: Record<SummaryCard['tone'], string> = {
    positive: 'text-teal-400',
    negative: 'text-red-500',
    neutral: 'text-yellow-400',
};

const toneIconMap: Record<SummaryCard['tone'], typeof ArrowUpRight> = {
    positive: ArrowUpRight,
    negative: ArrowDownRight,
    neutral: Minus,
};

const average = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

export default function WatchlistSummaryPanel({ watchlist }: { watchlist: StockWithData[] }) {
    const sortedByChange = [...watchlist].sort(
        (left, right) => (right.changePercent ?? Number.NEGATIVE_INFINITY) - (left.changePercent ?? Number.NEGATIVE_INFINITY)
    );

    const topGainer = sortedByChange[0];
    const topLoser = [...sortedByChange].reverse()[0];
    const averageChange = average(
        watchlist
            .map((item) => item.changePercent)
            .filter((item): item is number => typeof item === 'number')
    );

    const marketMood: SummaryCard = {
        title: averageChange > 0.5 ? 'Overall Trend' : averageChange < -0.5 ? 'Overall Trend' : 'Overall Trend',
        company:
            averageChange > 0.5
                ? 'Your watchlist is leaning bullish today.'
                : averageChange < -0.5
                  ? 'Your watchlist is under pressure today.'
                  : 'Your watchlist is moving sideways today.',
        symbol: `${watchlist.length} stocks`,
        value: `${averageChange >= 0 ? '+' : ''}${averageChange.toFixed(2)}% avg`,
        tone: averageChange > 0.5 ? 'positive' : averageChange < -0.5 ? 'negative' : 'neutral',
        detail: `Top-weighted names: ${watchlist
            .slice(0, 3)
            .map((item) => item.symbol)
            .join(', ')}`,
    };

    const cards: SummaryCard[] = [
        topGainer
            ? {
                  title: 'Top Gainer',
                  company: topGainer.company,
                  symbol: topGainer.symbol,
                  value: topGainer.changeFormatted || 'N/A',
                  tone: 'positive',
                  detail: `${topGainer.priceFormatted || 'N/A'} today`,
              }
            : marketMood,
        topLoser
            ? {
                  title: 'Top Loser',
                  company: topLoser.company,
                  symbol: topLoser.symbol,
                  value: topLoser.changeFormatted || 'N/A',
                  tone: 'negative',
                  detail: `${topLoser.priceFormatted || 'N/A'} today`,
              }
            : marketMood,
        marketMood,
    ];

    return (
        <aside className='watchlist-alerts flex'>
            <div className='flex w-full items-center justify-between'>
                <h2 className='watchlist-title'>Summary</h2>
                <span className='rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400'>
                    Watchlist-weighted
                </span>
            </div>

            <div className='alert-list'>
                {cards.map((card) => {
                    const Icon = toneIconMap[card.tone];

                    return (
                        <article key={`${card.title}-${card.symbol}`} className='alert-item'>
                            <div className='alert-name'>{card.title}</div>
                            <div className='alert-details'>
                                <div>
                                    <div className='alert-company'>{card.company}</div>
                                    <div className='mt-2 text-sm text-gray-500'>{card.symbol}</div>
                                </div>
                                <div className={cn('flex items-center gap-2 text-lg font-semibold', toneClassMap[card.tone])}>
                                    <Icon className='h-4 w-4' />
                                    {card.value}
                                </div>
                            </div>
                            <div className='text-sm leading-6 text-gray-400'>{card.detail}</div>
                        </article>
                    );
                })}
            </div>
        </aside>
    );
}
