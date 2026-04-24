import { Star } from 'lucide-react';
import SearchCommand from '@/components/SearchCommand';
import WatchlistNewsSection from '@/components/WatchlistNewsSection';
import WatchlistSummaryPanel from '@/components/WatchlistSummaryPanel';
import WatchlistTable from '@/components/WatchlistTable';
import { getNews, searchStocks } from '@/lib/actions/finnhub.actions';
import { getWatchlistWithData } from '@/lib/actions/watchlist.actions';

export const dynamic = 'force-dynamic';

const WatchlistPage = async () => {
    const [watchlist, initialStocks] = await Promise.all([getWatchlistWithData(), searchStocks()]);

    if (watchlist.length === 0) {
        return (
            <section className='watchlist-empty-container flex'>
                <div className='watchlist-empty'>
                    <Star className='watchlist-star' />
                    <h2 className='empty-title'>Your watchlist is empty</h2>
                    <p className='empty-description'>
                        Save the stocks you care about most, then come back here for a focused table,
                        watchlist-weighted summary, and tailored news.
                    </p>
                    <SearchCommand initialStocks={initialStocks} />
                </div>
            </section>
        );
    }

    const news = await getNews(watchlist.map((stock) => stock.symbol));

    return (
        <section className='space-y-10'>
            <div className='watchlist-container'>
                <div className='watchlist'>
                    <div className='flex items-center justify-between gap-4'>
                        <h1 className='watchlist-title'>Watchlist</h1>
                        <SearchCommand initialStocks={initialStocks} label='Add Stock' />
                    </div>

                    <WatchlistTable watchlist={watchlist} />
                </div>

                <WatchlistSummaryPanel watchlist={watchlist} />
            </div>

            <WatchlistNewsSection news={news.slice(0, 3)} />
        </section>
    );
};

export default WatchlistPage;
