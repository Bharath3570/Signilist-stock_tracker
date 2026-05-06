import NotificationList from '@/components/NotificationList';
import { getUserNotifications } from '@/lib/actions/notification.actions';

export const dynamic = 'force-dynamic';

const NotificationsPage = async () => {
    const notifications = await getUserNotifications(30);

    if (!notifications.length) {
        return (
            <section className='watchlist-empty-container flex'>
                <div className='watchlist-empty'>
                    <h2 className='empty-title'>No notifications yet</h2>
                    <p className='empty-description'>
                        Watchlist updates, alert activity, and triggered events will show up here once you start using them.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className='watchlist-container'>
            <div className='watchlist'>
                <NotificationList notifications={notifications} />
            </div>
        </section>
    );
};

export default NotificationsPage;
