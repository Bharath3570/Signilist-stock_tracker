'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { Notification } from '@/database/models/notification.model';

type NotificationCategory = 'watchlist' | 'alert' | 'system';

const requireSessionUser = async () => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.email) redirect('/sign-in');
    return session.user;
};

export async function createNotification(input: {
    userEmail: string;
    title: string;
    message: string;
    category: NotificationCategory;
    href?: string;
}) {
    try {
        await connectToDatabase();

        await Notification.create({
            userEmail: input.userEmail.toLowerCase(),
            title: input.title.trim(),
            message: input.message.trim(),
            category: input.category,
            href: input.href?.trim() || undefined,
            isRead: false,
            createdAt: new Date(),
        });

        revalidatePath('/notifications');
        revalidatePath('/');

        return { success: true };
    } catch (error) {
        console.error('createNotification error:', error);
        return { success: false };
    }
}

export async function getUserNotifications(limit = 12) {
    const user = await requireSessionUser();
    await connectToDatabase();

    const notifications = await Notification.find({ userEmail: user.email.toLowerCase() })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    return JSON.parse(JSON.stringify(notifications));
}

export async function getUnreadNotificationCount() {
    const user = await requireSessionUser();
    await connectToDatabase();

    return Notification.countDocuments({
        userEmail: user.email.toLowerCase(),
        isRead: false,
    });
}

export async function markNotificationAsRead(notificationId: string) {
    try {
        const user = await requireSessionUser();
        await connectToDatabase();

        await Notification.updateOne(
            { _id: notificationId, userEmail: user.email.toLowerCase() },
            { $set: { isRead: true } }
        );

        revalidatePath('/notifications');
        revalidatePath('/');

        return { success: true };
    } catch (error) {
        console.error('markNotificationAsRead error:', error);
        return { success: false, error: 'Failed to update notification.' };
    }
}

export async function markAllNotificationsAsRead() {
    try {
        const user = await requireSessionUser();
        await connectToDatabase();

        await Notification.updateMany(
            { userEmail: user.email.toLowerCase(), isRead: false },
            { $set: { isRead: true } }
        );

        revalidatePath('/notifications');
        revalidatePath('/');

        return { success: true };
    } catch (error) {
        console.error('markAllNotificationsAsRead error:', error);
        return { success: false, error: 'Failed to mark notifications as read.' };
    }
}

export async function deleteNotification(notificationId: string) {
    try {
        const user = await requireSessionUser();
        await connectToDatabase();

        await Notification.deleteOne({
            _id: notificationId,
            userEmail: user.email.toLowerCase(),
        });

        revalidatePath('/notifications');
        revalidatePath('/');

        return { success: true };
    } catch (error) {
        console.error('deleteNotification error:', error);
        return { success: false, error: 'Failed to delete notification.' };
    }
}
