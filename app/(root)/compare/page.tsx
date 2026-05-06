import CompareSelector from '@/components/CompareSelector';
import CompareAIVerdict from '@/components/CompareAIVerdict';
import Link from 'next/link';
import { getStockDetails } from '@/lib/actions/finnhub.actions';
import { getCurrentUserWatchlistSymbols } from '@/lib/actions/watchlist.actions';
import { cn } from '@/lib/utils';

const DEFAULT_COMPARE_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL'];

const parseSymbols = (symbolsParam?: string) => {
    if (!symbolsParam) return [];

    return symbolsParam
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);
};

const ComparePage = async ({
    searchParams,
}: {
    searchParams: Promise<{ symbols?: string }>;
}) => {
    const resolvedParams = await searchParams;
    const watchlistSymbols = await getCurrentUserWatchlistSymbols();
    const requestedSymbols = parseSymbols(resolvedParams?.symbols);
    const initialSymbols =
        requestedSymbols.length > 0
            ? requestedSymbols
            : watchlistSymbols.length > 0
              ? watchlistSymbols.slice(0, 5)
              : DEFAULT_COMPARE_SYMBOLS;
    const uniqueSymbols = Array.from(new Set(initialSymbols)).slice(0, 5);
    const stockDetails = await Promise.all(uniqueSymbols.map((symbol) => getStockDetails(symbol)));
    const comparedStocks = stockDetails.filter(
        (item): item is NonNullable<typeof item> => item !== null
    );

    const bestStock = comparedStocks
        .filter((stock) => typeof stock.changePercent === 'number')
        .sort((left, right) => (right.changePercent ?? 0) - (left.changePercent ?? 0))[0];

    return (
        <section className='watchlist-container'>
            <div className='watchlist space-y-6'>
                <h1 className='watchlist-title'>Compare Stocks</h1>
                <p className='text-gray-400'>
                    Add 2-5 stocks and compare key metrics side by side.
                </p>
                <CompareSelector initialSymbols={initialSymbols} />
                <CompareAIVerdict symbols={uniqueSymbols} />

                {comparedStocks.length > 0 ? (
                    <div className='space-y-4'>
                        {bestStock ? (
                            <div className='rounded-xl border border-teal-400/20 bg-gradient-to-r from-teal-400/10 to-transparent px-4 py-4 text-sm text-teal-200'>
                                Best mover right now: <span className='font-semibold'>{bestStock.symbol}</span>{' '}
                                ({bestStock.changeFormatted}) is setting the pace for this comparison.
                            </div>
                        ) : null}

                        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                            {comparedStocks.map((stock) => (
                                <article
                                    key={stock.symbol}
                                    className='rounded-lg border border-gray-600 bg-gray-800 p-5'
                                >
                                    <div className='flex items-start justify-between gap-3'>
                                        <div>
                                            <h2 className='text-lg font-semibold text-gray-100'>{stock.company}</h2>
                                            <p className='text-sm text-gray-500'>{stock.symbol}</p>
                                        </div>
                                        <Link
                                            href={`/stocks/${encodeURIComponent(stock.symbol)}`}
                                            className='text-sm text-yellow-500 hover:text-yellow-400'
                                        >
                                            Open
                                        </Link>
                                    </div>

                                    <div className='mt-5 space-y-3 text-sm'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-gray-500'>Price</span>
                                            <span className='font-semibold text-gray-100'>{stock.priceFormatted}</span>
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-gray-500'>Change</span>
                                            <span
                                                className={cn(
                                                    'font-semibold',
                                                    (stock.changePercent ?? 0) >= 0
                                                        ? 'text-teal-400'
                                                        : 'text-red-500'
                                                )}
                                            >
                                                {stock.changeFormatted}
                                            </span>
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-gray-500'>Market Cap</span>
                                            <span className='font-semibold text-gray-100'>
                                                {stock.marketCapFormatted}
                                            </span>
                                        </div>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-gray-500'>P/E Ratio</span>
                                            <span className='font-semibold text-gray-100'>{stock.peRatio}</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className='rounded-lg border border-gray-600 bg-gray-800 p-6 text-gray-500'>
                        No comparison data available yet for selected symbols.
                    </div>
                )}
            </div>
        </section>
    );
};

export default ComparePage;
