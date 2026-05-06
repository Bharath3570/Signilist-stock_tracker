'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    deleteNotification,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '@/lib/actions/notification.actions';

type NotificationItem = {
    _id: string;
    title: string;
    message: string;
    category: 'watchlist' | 'alert' | 'system';
    href?: string;
    isRead: boolean;
    createdAt: string;
};

const formatTime = (value: string) =>
    new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

export default function NotificationList({ notifications }: { notifications: NotificationItem[] }) {
    const [isPending, startTransition] = useTransition();

    const onMarkAll = () => {
        startTransition(async () => {
            const result = await markAllNotificationsAsRead();
            if (!result.success) {
                toast.error(result.error ?? 'Failed to update notifications.');
                return;
            }
            toast.success('All notifications marked as read');
        });
    };

    const onMarkOne = (id: string) => {
        startTransition(async () => {
            const result = await markNotificationAsRead(id);
            if (!result.success) {
                toast.error(result.error ?? 'Failed to update notification.');
                return;
            }
        });
    };

    const onDelete = (id: string) => {
        startTransition(async () => {
            const result = await deleteNotification(id);
            if (!result.success) {
                toast.error(result.error ?? 'Failed to delete notification.');
                return;
            }
            toast.success('Notification deleted');
        });
    };

    return (
        <div className='space-y-5'>
            <div className='flex items-center justify-between gap-3'>
                <div>
                    <h1 className='watchlist-title'>Notifications</h1>
                    <p className='text-sm text-gray-500'>
                        Watchlist changes, alert updates, and triggered events appear here.
                    </p>
                </div>
                <Button
                    type='button'
                    className='yellow-btn h-10 px-4'
                    disabled={isPending || notifications.length === 0}
                    onClick={onMarkAll}
                >
                    Mark all read
                </Button>
            </div>

            <div className='space-y-3'>
                {notifications.map((item) => (
                    <div
                        key={item._id}
                        className={`rounded-xl border p-4 ${
                            item.isRead
                                ? 'border-gray-700 bg-gray-900/40'
                                : 'border-yellow-500/20 bg-yellow-500/5'
                        }`}
                    >
                        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                            <div className='space-y-2'>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <h2 className='text-base font-semibold text-gray-100'>{item.title}</h2>
                                    <span className='rounded-full border border-gray-700 bg-gray-900 px-2 py-0.5 text-xs uppercase tracking-wide text-gray-400'>
                                        {item.category}
                                    </span>
                                    {!item.isRead ? (
                                        <span className='rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-200'>
                                            New
                                        </span>
                                    ) : null}
                                </div>
                                <p className='text-sm text-gray-300'>{item.message}</p>
                                <p className='text-xs text-gray-500'>{formatTime(item.createdAt)}</p>
                            </div>

                            <div className='flex items-center gap-2'>
                                {item.href ? (
                                    <Link
                                        href={item.href}
                                        className='inline-flex h-10 items-center rounded-md border border-gray-700 px-3 text-sm text-gray-200 transition-colors hover:border-yellow-500/40 hover:text-yellow-300'
                                        onClick={() => {
                                            if (!item.isRead) onMarkOne(item._id);
                                        }}
                                    >
                                        Open
                                    </Link>
                                ) : null}
                                {!item.isRead ? (
                                    <Button
                                        type='button'
                                        variant='outline'
                                        className='border-gray-700 bg-transparent text-gray-200 hover:bg-gray-800'
                                        disabled={isPending}
                                        onClick={() => onMarkOne(item._id)}
                                    >
                                        Mark read
                                    </Button>
                                ) : null}
                                <button
                                    type='button'
                                    className='inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-700 text-gray-300 transition-colors hover:border-red-500/40 hover:text-red-400'
                                    onClick={() => onDelete(item._id)}
                                    disabled={isPending}
                                    aria-label='Delete notification'
                                    title='Delete notification'
                                >
                                    <Trash2 className='h-4 w-4' />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
