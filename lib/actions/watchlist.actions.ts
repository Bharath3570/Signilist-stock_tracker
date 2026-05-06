'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { formatChangePercent, formatMarketCapValue, formatPrice } from '@/lib/utils';
import { createNotification } from '@/lib/actions/notification.actions';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

type SessionUser = {
    id: string;
    email: string;
    name: string;
};

const getFinnhubToken = () => {
    const token = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

    if (!token) {
        throw new Error('FINNHUB API key is not configured');
    }

    return token;
};

async function fetchFinnhubJSON<T>(url: string): Promise<T> {
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(`Finnhub request failed (${response.status}): ${message}`);
    }

    return (await response.json()) as T;
}

async function getUserIdByEmail(email: string) {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) throw new Error('MongoDB connection not found');

    const user = await db
        .collection('user')
        .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return null;

    return (user.id as string) || String(user._id || '') || null;
}

async function getCurrentSessionUser(): Promise<SessionUser | null> {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.email) return null;

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
    };
}

async function requireCurrentUser(): Promise<SessionUser> {
    const user = await getCurrentSessionUser();

    if (!user) {
        redirect('/sign-in');
    }

    return user;
}

export async function addToWatchlist(symbol: string, company: string) {
    const cleanedSymbol = symbol.trim().toUpperCase();
    const cleanedCompany = company.trim() || cleanedSymbol;

    if (!cleanedSymbol) {
        return { success: false, error: 'Stock symbol is required.' };
    }

    try {
        const user = await requireCurrentUser();
        await connectToDatabase();

        await Watchlist.findOneAndUpdate(
            { userId: user.id, symbol: cleanedSymbol },
            {
                $setOnInsert: {
                    userId: user.id,
                    symbol: cleanedSymbol,
                    company: cleanedCompany,
                    addedAt: new Date(),
                },
            },
            { upsert: true, returnDocument: 'after' }
        );

        revalidatePath('/');
        revalidatePath('/watchlist');
        revalidatePath(`/stocks/${cleanedSymbol}`);

        await createNotification({
            userEmail: user.email,
            title: 'Watchlist updated',
            message: `${cleanedSymbol} was added to your watchlist.`,
            category: 'watchlist',
            href: '/watchlist',
        });

        return { success: true };
    } catch (error) {
        console.error('addToWatchlist error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add stock to watchlist.',
        };
    }
}

export async function removeFromWatchlist(symbol: string) {
    const cleanedSymbol = symbol.trim().toUpperCase();

    if (!cleanedSymbol) {
        return { success: false, error: 'Stock symbol is required.' };
    }

    try {
        const user = await requireCurrentUser();
        await connectToDatabase();

        await Watchlist.deleteOne({
            userId: user.id,
            symbol: cleanedSymbol,
        });

        revalidatePath('/');
        revalidatePath('/watchlist');
        revalidatePath(`/stocks/${cleanedSymbol}`);

        await createNotification({
            userEmail: user.email,
            title: 'Watchlist updated',
            message: `${cleanedSymbol} was removed from your watchlist.`,
            category: 'watchlist',
            href: '/watchlist',
        });

        return { success: true };
    } catch (error) {
        console.error('removeFromWatchlist error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to remove stock from watchlist.',
        };
    }
}

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
    if (!email) return [];

    try {
        await connectToDatabase();
        const userId = await getUserIdByEmail(email);

        if (!userId) return [];

        const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
        return items.map((item) => String(item.symbol).toUpperCase());
    } catch (error) {
        console.error('getWatchlistSymbolsByEmail error:', error);
        return [];
    }
}

export async function getCurrentUserWatchlistSymbols(): Promise<string[]> {
    const user = await getCurrentSessionUser();

    if (!user?.email) return [];

    return getWatchlistSymbolsByEmail(user.email);
}

export async function getUserWatchlist() {
    const user = await requireCurrentUser();

    try {
        await connectToDatabase();

        const watchlist = await Watchlist.find({ userId: user.id }).sort({ addedAt: -1 }).lean();
        return JSON.parse(JSON.stringify(watchlist));
    } catch (error) {
        console.error('getUserWatchlist error:', error);
        return [];
    }
}

export async function getWatchlistWithData(): Promise<StockWithData[]> {
    const user = await requireCurrentUser();

    try {
        await connectToDatabase();

        const watchlist = await Watchlist.find({ userId: user.id }).sort({ addedAt: -1 }).lean();

        if (watchlist.length === 0) return [];

        const token = getFinnhubToken();

        return await Promise.all(
            watchlist.map(async (item, index) => {
                const symbol = String(item.symbol).toUpperCase();

                const [quote, profile, financials] = await Promise.allSettled([
                    fetchFinnhubJSON<QuoteData>(
                        `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`
                    ),
                    fetchFinnhubJSON<ProfileData>(
                        `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`
                    ),
                    fetchFinnhubJSON<FinancialsData>(
                        `${FINNHUB_BASE_URL}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${token}`
                    ),
                ]);

                const quoteData = quote.status === 'fulfilled' ? quote.value : {};
                const profileData = profile.status === 'fulfilled' ? profile.value : {};
                const financialData = financials.status === 'fulfilled' ? financials.value : {};
                const peRatio =
                    financialData.metric?.peNormalizedAnnual ?? financialData.metric?.peTTM;

                return {
                    id: String(item._id),
                    symbol,
                    company: item.company || profileData.name || symbol,
                    addedAt: item.addedAt,
                    currentPrice: quoteData.c,
                    changePercent: quoteData.dp,
                    priceFormatted:
                        typeof quoteData.c === 'number' && quoteData.c > 0 ? formatPrice(quoteData.c) : 'N/A',
                    changeFormatted: formatChangePercent(quoteData.dp) || 'N/A',
                    marketCap:
                        typeof profileData.marketCapitalization === 'number'
                            ? formatMarketCapValue(profileData.marketCapitalization * 1_000_000)
                            : 'N/A',
                    peRatio: typeof peRatio === 'number' ? peRatio.toFixed(1) : 'N/A',
                    summaryWeight: index < 3 ? 'High' : 'Medium',
                };
            })
        );
    } catch (error) {
        console.error('getWatchlistWithData error:', error);
        return [];
    }
}
