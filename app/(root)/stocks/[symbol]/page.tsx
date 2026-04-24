import { notFound } from 'next/navigation';
import TradingViewWidget from '@/components/TradingViewWidget';
import WatchlistButton from '@/components/WatchlistButton';
import { getStockDetails } from '@/lib/actions/finnhub.actions';
import { getCurrentUserWatchlistSymbols } from '@/lib/actions/watchlist.actions';
import {
    BASELINE_WIDGET_CONFIG,
    CANDLE_CHART_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
    SYMBOL_INFO_WIDGET_CONFIG,
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
} from '@/lib/constants';

export default async function StockDetails({ params }: StockDetailsPageProps) {
    const { symbol } = await params;
    const normalizedSymbol = symbol.toUpperCase();
    const stockData = await getStockDetails(normalizedSymbol);
    const watchlistSymbols = await getCurrentUserWatchlistSymbols();

    if (!stockData) notFound();

    const scriptUrl = 'https://s3.tradingview.com/external-embedding/embed-widget-';

    return (
        <div className='flex min-h-screen p-4 md:p-6 lg:p-8'>
            <section className='grid w-full grid-cols-1 gap-8 md:grid-cols-2'>
                <div className='flex flex-col gap-6'>
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}symbol-info.js`}
                        config={SYMBOL_INFO_WIDGET_CONFIG(normalizedSymbol)}
                        height={170}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}advanced-chart.js`}
                        config={CANDLE_CHART_WIDGET_CONFIG(normalizedSymbol)}
                        className='custom-chart'
                        height={600}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}advanced-chart.js`}
                        config={BASELINE_WIDGET_CONFIG(normalizedSymbol)}
                        className='custom-chart'
                        height={600}
                    />
                </div>

                <div className='flex flex-col gap-6'>
                    <div className='flex items-center justify-between'>
                        <WatchlistButton
                            symbol={normalizedSymbol}
                            company={stockData.company}
                            isInWatchlist={watchlistSymbols.includes(normalizedSymbol)}
                        />
                    </div>

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}technical-analysis.js`}
                        config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(normalizedSymbol)}
                        height={400}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}company-profile.js`}
                        config={COMPANY_PROFILE_WIDGET_CONFIG(normalizedSymbol)}
                        height={440}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}financials.js`}
                        config={COMPANY_FINANCIALS_WIDGET_CONFIG(normalizedSymbol)}
                        height={464}
                    />
                </div>
            </section>
        </div>
    );
}
