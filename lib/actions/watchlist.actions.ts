'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '../better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Watchlist } from '@/database/models/watchlist.model';
import { getStockDetails } from "./finnhub.actions"; // ✅ correct import

// ✅ Add stock
export const addToWatchlist = async (symbol: string, company: string) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) redirect('/sign-in');

        const existingItem = await Watchlist.findOne({
            userId: session.user.id,
            symbol: symbol.toUpperCase(),
        });

        if (existingItem) {
            return { success: false, error: 'Stock already in watchlist' };
        }

        const newItem = new Watchlist({
            userId: session.user.id,
            symbol: symbol.toUpperCase(),
            company: company.trim(),
        });

        await newItem.save();

        revalidatePath('/watchlist');

        return { success: true };
    } catch (error) {
        console.error(error);
        throw new Error('Failed to add stock');
    }
};

// ❌ Remove stock
export const removeFromWatchlist = async (symbol: string) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) redirect('/sign-in');

        await Watchlist.deleteOne({
            userId: session.user.id,
            symbol: symbol.toUpperCase(),
        });

        revalidatePath('/watchlist');

        return { success: true };
    } catch (error) {
        console.error(error);
        throw new Error('Failed to remove stock');
    }
};

// ✅ Get watchlist symbols
export const getWatchlistSymbolsByEmail = async (email: string) => {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) return [];

        const items = await Watchlist.find({
            userId: session.user.id,
        });

        return items.map((item: any) => item.symbol.toUpperCase());
    } catch (error) {
        console.error('Error fetching watchlist symbols:', error);
        return [];
    }
};

// ✅ Get raw watchlist
export const getUserWatchlist = async () => {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) redirect('/sign-in');

        const watchlist = await Watchlist.find({
            userId: session.user.id,
        })
            .sort({ addedAt: -1 })
            .lean();

        return JSON.parse(JSON.stringify(watchlist));
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        throw new Error('Failed to fetch watchlist');
    }
};

// ✅ FINAL: Watchlist with stock data
export const getWatchlistWithData = async () => {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) return [];

        const watchlist = await Watchlist.find({
            userId: session.user.id,
        }).lean();

        if (!watchlist.length) return [];

        const stocksWithData = await Promise.all(
            watchlist.map(async (item) => {
                // ✅ FIXED FUNCTION NAME HERE
                const stockData = await getStockDetails(item.symbol);

                if (!stockData) return item;

                return {
                    company: stockData.company,
                    symbol: stockData.symbol,
                    priceFormatted: stockData.priceFormatted,
                    changeFormatted: stockData.changeFormatted,
                    changePercent: stockData.changePercent,
                    marketCap: stockData.marketCapFormatted,
                    peRatio: stockData.peRatio,
                };
            })
        );

        return JSON.parse(JSON.stringify(stocksWithData));
    } catch (error) {
        console.error('Error loading watchlist:', error);
        return [];
    }
};