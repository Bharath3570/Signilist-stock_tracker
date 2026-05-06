'use server';

import { POPULAR_STOCK_SYMBOLS } from '@/lib/constants';
import {
    calculateNewsDistribution,
    formatArticle,
    formatChangePercent,
    formatMarketCapValue,
    formatPrice,
    getDateRange,
    validateArticle,
} from '@/lib/utils';
import { getCurrentUserWatchlistSymbols } from './watchlist.actions';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

type FinnhubProfileLookup = {
    name?: string;
    ticker?: string;
    exchange?: string;
    marketCapitalization?: number;
};

type FinnhubSearchResultWithExchange = FinnhubSearchResult & {
    exchange?: string;
};

async function fetchJSON<T>(url: string, revalidateSeconds?: number): Promise<T | null> {
    const options: RequestInit & { next?: { revalidate?: number } } = revalidateSeconds
        ? { cache: 'force-cache', next: { revalidate: revalidateSeconds } }
        : { cache: 'no-store' };

    const response = await fetch(url, options);

    if (!response.ok) {
        const message = await response.text().catch(() => '');
        // Finnhub returns 401/403 when the token is invalid or the endpoint is not allowed for the plan.
        // Treat these as "no data" so UI can degrade to N/A instead of throwing a dev overlay.
        if (response.status === 401 || response.status === 403 || response.status === 429) {
            console.warn(`Finnhub access error ${response.status}: ${message}`);
            return null;
        }

        throw new Error(`Fetch failed ${response.status}: ${message}`);
    }

    return (await response.json()) as T;
}

const getFinnhubToken = () => {
    const token = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

    if (!token) {
        throw new Error('FINNHUB API key is not configured');
    }

    return token;
};

export async function searchStocks(query?: string): Promise<StockWithWatchlistStatus[]> {
    try {
        const token = getFinnhubToken();
        const watchlistSymbols = new Set(await getCurrentUserWatchlistSymbols());
        const trimmedQuery = typeof query === 'string' ? query.trim() : '';

        let results: FinnhubSearchResultWithExchange[] = [];

        if (!trimmedQuery) {
            const profiles: Array<FinnhubSearchResultWithExchange | null> = await Promise.all(
                POPULAR_STOCK_SYMBOLS.slice(0, 10).map(async (symbol) => {
                    try {
                        const profile = await fetchJSON<FinnhubProfileLookup>(
                            `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`,
                            3600
                        );

                        if (!profile?.name) return null;

                        return {
                            symbol: symbol.toUpperCase(),
                            description: profile.name,
                            displaySymbol: symbol.toUpperCase(),
                            type: 'Common Stock',
                            exchange: profile.exchange,
                        } satisfies FinnhubSearchResultWithExchange;
                    } catch (error) {
                        console.error('searchStocks profile error:', symbol, error);
                        return null;
                    }
                })
            );

            results = profiles.filter((item): item is FinnhubSearchResultWithExchange => item !== null);
        } else {
            const data = await fetchJSON<FinnhubSearchResponse>(
                `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(trimmedQuery)}&token=${token}`,
                1800
            );

            results = Array.isArray(data?.result) ? data.result : [];
        }

        const uniqueResults = results.reduce<StockWithWatchlistStatus[]>((acc, stock) => {
            const symbol = (stock.symbol || '').toUpperCase();
            if (!symbol || acc.some((item) => item.symbol === symbol)) return acc;

            acc.push({
                symbol,
                name: stock.description || symbol,
                exchange: stock.displaySymbol || stock.exchange || 'US',
                type: stock.type || 'Stock',
                isInWatchlist: watchlistSymbols.has(symbol),
            });

            return acc;
        }, []);

        return uniqueResults.slice(0, 15);
    } catch (error) {
        console.error('searchStocks error:', error);
        return [];
    }
}

export async function getStockDetails(symbol: string) {
    try {
        const cleanSymbol = symbol.trim().toUpperCase();
        const token = getFinnhubToken();

        const [quote, profile, financials] = await Promise.all([
            fetchJSON<QuoteData>(
                `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(cleanSymbol)}&token=${token}`
            ),
            fetchJSON<ProfileData>(
                `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(cleanSymbol)}&token=${token}`,
                3600
            ),
            fetchJSON<FinancialsData>(
                `${FINNHUB_BASE_URL}/stock/metric?symbol=${encodeURIComponent(cleanSymbol)}&metric=all&token=${token}`,
                3600
            ),
        ]);

        if (!profile?.name) return null;

        const changePercent = quote?.dp || 0;
        const peRatio = financials?.metric?.peNormalizedAnnual ?? financials?.metric?.peTTM;

        return {
            symbol: cleanSymbol,
            company: profile.name,
            price: quote?.c || 0,
            changePercent,
            priceFormatted: typeof quote?.c === 'number' ? formatPrice(quote.c) : 'N/A',
            changeFormatted: formatChangePercent(changePercent) || 'N/A',
            peRatio: typeof peRatio === 'number' ? peRatio.toFixed(1) : 'N/A',
            marketCap: profile.marketCapitalization || 0,
            marketCapFormatted:
                typeof profile.marketCapitalization === 'number'
                    ? formatMarketCapValue(profile.marketCapitalization * 1_000_000)
                    : 'N/A',
        };
    } catch (error) {
        console.error('getStockDetails error:', error);
        return null;
    }
}

export async function getNews(symbols?: string[]): Promise<MarketNewsArticle[]> {
    try {
        const token = getFinnhubToken();
        const range = getDateRange(5);
        const cleanSymbols = (symbols || [])
            .map((item) => item?.trim().toUpperCase())
            .filter((item): item is string => Boolean(item));

        const maxArticles = 6;

        if (cleanSymbols.length > 0) {
            const { itemsPerSymbol, targetNewsCount } = calculateNewsDistribution(cleanSymbols.length);
            const perSymbolArticles: Record<string, RawNewsArticle[]> = {};

            await Promise.all(
                cleanSymbols.map(async (symbol) => {
                    try {
                        const articles = await fetchJSON<RawNewsArticle[]>(
                            `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(symbol)}&from=${range.from}&to=${range.to}&token=${token}`,
                            300
                        );

                        perSymbolArticles[symbol] = (articles || []).filter(validateArticle);
                    } catch (error) {
                        console.error('getNews company-news error:', symbol, error);
                        perSymbolArticles[symbol] = [];
                    }
                })
            );

            const collected: MarketNewsArticle[] = [];

            for (let round = 0; round < itemsPerSymbol; round++) {
                for (const symbol of cleanSymbols) {
                    const article = perSymbolArticles[symbol]?.shift();

                    if (!article || !validateArticle(article)) continue;

                    collected.push(formatArticle(article, true, symbol, round));

                    if (collected.length >= targetNewsCount) break;
                }

                if (collected.length >= targetNewsCount) break;
            }

            if (collected.length < maxArticles) {
                const generalArticles = await fetchJSON<RawNewsArticle[]>(
                    `${FINNHUB_BASE_URL}/news?category=general&token=${token}`,
                    300
                );

                const seenUrls = new Set(collected.map((article) => article.url));

                for (const article of generalArticles || []) {
                    if (!validateArticle(article) || !article.url || seenUrls.has(article.url)) continue;

                    collected.push(formatArticle(article, false, undefined, collected.length));
                    seenUrls.add(article.url);

                    if (collected.length >= maxArticles) break;
                }
            }

            if (collected.length > 0) {
                collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
                return collected.slice(0, maxArticles);
            }
        }

        const generalArticles = await fetchJSON<RawNewsArticle[]>(
            `${FINNHUB_BASE_URL}/news?category=general&token=${token}`,
            300
        );

        const seenKeys = new Set<string>();
        const unique: RawNewsArticle[] = [];

        for (const article of generalArticles || []) {
            if (!validateArticle(article)) continue;

            const key = `${article.id}-${article.url}-${article.headline}`;
            if (seenKeys.has(key)) continue;

            seenKeys.add(key);
            unique.push(article);

            if (unique.length >= 20) break;
        }

        return unique.slice(0, maxArticles).map((article, index) => formatArticle(article, false, undefined, index));
    } catch (error) {
        console.error('getNews error:', error);
        return [];
    }
}
