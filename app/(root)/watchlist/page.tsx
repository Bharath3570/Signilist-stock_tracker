import Link from "next/link";
import {Star} from "lucide-react";
import SearchCommand from "@/components/SearchCommand";
import WatchlistButton from "@/components/WatchlistButton";
import {WATCHLIST_TABLE_HEADER} from "@/lib/constants";
import {getNews, searchStocks} from "@/lib/actions/finnhub.actions";
import {getChangeColorClass} from "@/lib/utils";
import {getWatchlistForCurrentUser} from "@/lib/actions/watchlist.actions";

export const dynamic = "force-dynamic";

const WatchlistPage = async () => {
    const [watchlist, initialStocks] = await Promise.all([
        getWatchlistForCurrentUser(),
        searchStocks(),
    ]);

    if (watchlist.length === 0) {
        return (
            <section className="watchlist-empty-container flex">
                <div className="watchlist-empty">
                    <Star className="watchlist-star" />
                    <h1 className="empty-title">Your watchlist is empty</h1>
                    <p className="empty-description">
                        Add stocks from search to start tracking the companies you care about most. Your daily summary
                        will lean more heavily toward the names you save here.
                    </p>
                    <SearchCommand renderAs="button" label="Add your first stock" initialStocks={initialStocks} />
                </div>
            </section>
        );
    }

    const symbols = watchlist.map((stock) => stock.symbol);
    const news = await getNews(symbols);

    return (
        <section className="watchlist-container">
            <div className="watchlist">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="watchlist-title">Your watchlist</h1>
                        <p className="mt-2 text-gray-500">
                            {watchlist.length} tracked stock{watchlist.length === 1 ? "" : "s"} powering your
                            personalized summary.
                        </p>
                    </div>
                    <SearchCommand renderAs="button" label="Add stock" initialStocks={initialStocks} />
                </div>

                <div className="watchlist-table overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                        <tr className="table-header-row">
                            {WATCHLIST_TABLE_HEADER.map((header) => (
                                <th key={header} className="table-header px-4 py-4 text-left text-sm">
                                    {header}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {watchlist.map((stock) => (
                            <tr key={stock.id} className="table-row">
                                <td className="table-cell px-4 py-4">
                                    <Link href={`/stocks/${stock.symbol}`} className="hover:text-yellow-500 transition-colors">
                                        {stock.company}
                                    </Link>
                                </td>
                                <td className="table-cell px-4 py-4">{stock.symbol}</td>
                                <td className="table-cell px-4 py-4">{stock.priceFormatted}</td>
                                <td className={`table-cell px-4 py-4 ${getChangeColorClass(stock.changePercent)}`}>
                                    {stock.changeFormatted}
                                </td>
                                <td className="table-cell px-4 py-4">{stock.marketCap}</td>
                                <td className="table-cell px-4 py-4">{stock.peRatio}</td>
                                <td className="table-cell px-4 py-4 text-yellow-500">High</td>
                                <td className="table-cell px-4 py-4">
                                    <WatchlistButton
                                        symbol={stock.symbol}
                                        company={stock.company}
                                        isInWatchlist
                                        showTrashIcon
                                    />
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <aside className="watchlist-alerts flex">
                <div className="w-full rounded-lg border border-gray-600 bg-gray-800 p-6">
                    <h2 className="watchlist-title">Summary preview</h2>
                    <p className="mt-3 text-sm leading-6 text-gray-400">
                        Your daily summary now prioritizes company-specific coverage for these watched symbols first,
                        then fills any remaining space with broader market news.
                    </p>
                </div>

                <div className="w-full rounded-lg border border-gray-600 bg-gray-800 p-6">
                    <h2 className="watchlist-title">Watchlist news</h2>
                    <div className="mt-5 space-y-4">
                        {news.slice(0, 4).map((article) => (
                            <a
                                key={article.id}
                                href={article.url}
                                target="_blank"
                                rel="noreferrer"
                                className="news-item block p-4"
                            >
                                <div className="news-tag">{article.related || "Market"}</div>
                                <h3 className="news-title">{article.headline}</h3>
                                <p className="news-summary">{article.summary}</p>
                                <span className="news-cta">Read story</span>
                            </a>
                        ))}
                    </div>
                </div>
            </aside>
        </section>
    );
};

export default WatchlistPage;
