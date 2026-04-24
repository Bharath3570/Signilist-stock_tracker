'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { Alert } from '@/database/models/alert.model';

const requireSessionUser = async () => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.email) redirect('/sign-in');
    return session.user;
};

const normalizeCondition = (value: string): '>' | '<' | null => {
    if (value === '>' || value === '<') return value;
    return null;
};

export async function createAlert(input: {
    symbol: string;
    company?: string;
    alertName: string;
    condition: string;
    targetPrice: number;
}) {
    try {
        const user = await requireSessionUser();
        const userEmail = user.email.toLowerCase();

        const symbol = input.symbol.trim().toUpperCase();
        const alertName = input.alertName.trim();
        const condition = normalizeCondition(input.condition);
        const targetPrice = Number(input.targetPrice);
        const company = (input.company ?? '').trim();

        if (!symbol) return { success: false, error: 'Stock symbol is required.' };
        if (!alertName) return { success: false, error: 'Alert name is required.' };
        if (!condition) return { success: false, error: 'Condition must be > or <.' };
        if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
            return { success: false, error: 'Target price must be a positive number.' };
        }

        await connectToDatabase();

        try {
            await Alert.create({
                userEmail,
                symbol,
                company: company || undefined,
                alertName,
                condition,
                targetPrice,
                isActive: true,
                createdAt: new Date(),
            });
        } catch (err: unknown) {
            const maybeDuplicate =
                typeof err === 'object' && err !== null && 'code' in err && (err as { code?: unknown }).code === 11000;

            if (maybeDuplicate) {
                return { success: false, error: 'This alert already exists for this stock.' };
            }
            throw err;
        }

        revalidatePath('/alerts');
        revalidatePath('/watchlist');

        return { success: true };
    } catch (error) {
        console.error('createAlert error:', error);
        return { success: false, error: 'Failed to create alert.' };
    }
}

export async function getUserAlerts() {
    const user = await requireSessionUser();
    const userEmail = user.email.toLowerCase();

    await connectToDatabase();

    const alerts = await Alert.find({ userEmail }).sort({ createdAt: -1 }).lean();
    return JSON.parse(JSON.stringify(alerts));
}

export async function deleteAlert(alertId: string) {
    try {
        const user = await requireSessionUser();
        const userEmail = user.email.toLowerCase();

        await connectToDatabase();

        await Alert.deleteOne({ _id: alertId, userEmail });

        revalidatePath('/alerts');
        revalidatePath('/watchlist');

        return { success: true };
    } catch (error) {
        console.error('deleteAlert error:', error);
        return { success: false, error: 'Failed to delete alert.' };
    }
}

export async function updateAlert(input: {
    alertId: string;
    alertName?: string;
    condition?: string;
    targetPrice?: number;
    isActive?: boolean;
}) {
    try {
        const user = await requireSessionUser();
        const userEmail = user.email.toLowerCase();

        await connectToDatabase();

        const update: Record<string, unknown> = {};
        if (typeof input.alertName === 'string' && input.alertName.trim()) update.alertName = input.alertName.trim();
        if (typeof input.isActive === 'boolean') update.isActive = input.isActive;
        if (typeof input.targetPrice === 'number') update.targetPrice = input.targetPrice;

        if (typeof input.condition === 'string') {
            const condition = normalizeCondition(input.condition);
            if (condition) update.condition = condition;
        }

        await Alert.updateOne({ _id: input.alertId, userEmail }, { $set: update });

        revalidatePath('/alerts');
        revalidatePath('/watchlist');

        return { success: true };
    } catch (error) {
        console.error('updateAlert error:', error);
        return { success: false, error: 'Failed to update alert.' };
    }
}
