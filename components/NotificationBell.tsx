import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getUnreadNotificationCount } from '@/lib/actions/notification.actions';

export default async function NotificationBell() {
    const unreadCount = await getUnreadNotificationCount();

    return (
        <Link
            href='/notifications'
            className='relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 bg-gray-900/70 text-gray-300 transition-colors hover:border-yellow-500/40 hover:text-yellow-400'
            aria-label='Notifications'
        >
            <Bell className='h-4 w-4' />
            {unreadCount > 0 ? (
                <span className='absolute -right-1 -top-1 min-w-5 rounded-full bg-yellow-500 px-1.5 py-0.5 text-center text-[10px] font-semibold text-yellow-950'>
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            ) : null}
        </Link>
    );
}
