'use server';

import { auth } from '../better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getWatchlistSymbolsByEmail } from './watchlist.actions';

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";


// 🔍 Search Stocks
export const searchStocks = async (query?: string) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) redirect('/sign-in');

        const userWatchlistSymbols = await getWatchlistSymbolsByEmail(
            session.user.email
        );

        const token = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

        if (!token) {
            console.error('Missing FINNHUB API key');
            return [];
        }

        const q = query?.trim() || '';

        const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(q)}&token=${token}`;

        const res = await fetch(url);
        const data = await res.json();

        const results = data?.result || [];

        return results.slice(0, 15).map((stock: any) => ({
            symbol: stock.symbol?.toUpperCase(),
            name: stock.description,
            exchange: stock.displaySymbol || 'US',
            type: stock.type || 'Stock',
            isInWatchlist: userWatchlistSymbols.includes(
                stock.symbol?.toUpperCase()
            ),
        }));

    } catch (err) {
        console.error('Search error:', err);
        return [];
    }
};


// 📊 Get Stock Details (MERGED VERSION)
export const getStockDetails = async (symbol: string) => {
    try {
        const cleanSymbol = symbol.trim().toUpperCase();
        const token = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

        if (!token) {
            console.error('Missing FINNHUB API key');
            return null;
        }

        const [quoteRes, profileRes, financialsRes] = await Promise.all([
            fetch(`${FINNHUB_BASE_URL}/quote?symbol=${cleanSymbol}&token=${token}`),
            fetch(`${FINNHUB_BASE_URL}/stock/profile2?symbol=${cleanSymbol}&token=${token}`),
            fetch(`${FINNHUB_BASE_URL}/stock/metric?symbol=${cleanSymbol}&metric=all&token=${token}`)
        ]);

        const quote = await quoteRes.json();
        const profile = await profileRes.json();
        const financials = await financialsRes.json();

        // ❗ Basic validation
        if (!profile?.name) return null;

        const changePercent = quote?.dp || 0;
        const peRatio = financials?.metric?.peNormalizedAnnual || null;

        return {
            symbol: cleanSymbol,
            company: profile.name,

            // 📊 Price
            price: quote?.c || 0,
            change: changePercent,

            // 💰 Extra data (merged from advanced code)
            peRatio: peRatio ? peRatio.toFixed(1) : '—',
            marketCap: profile?.marketCapitalization || 0,
        };

    } catch (err) {
        console.error("Stock details error:", err);
        return null;
    }
};