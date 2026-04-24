import AlertCard from '@/components/AlertCard';
import { getUserAlerts } from '@/lib/actions/alert.actions';
import { getStockDetails } from '@/lib/actions/finnhub.actions';
import { formatChangePercent, formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type StoredAlert = {
    _id: string;
    symbol: string;
    company?: string;
    alertName: string;
    condition: '>' | '<';
    targetPrice: number;
    isActive?: boolean;
    createdAt?: string;
};

type ConditionTone = 'positive' | 'negative';

const AlertsPage = async () => {
    const alerts = (await getUserAlerts()) as StoredAlert[];

    if (!alerts || alerts.length === 0) {
        return (
            <section className='watchlist-empty-container flex'>
                <div className='watchlist-empty'>
                    <h2 className='empty-title'>No alerts yet</h2>
                    <p className='empty-description'>
                        Go to your watchlist and click Add Alert to create your first price alert.
                    </p>
                </div>
            </section>
        );
    }

    const enriched = await Promise.all(
        alerts.map(async (alert) => {
            const symbol = String(alert.symbol || '').toUpperCase();
            const company = String(alert.company || symbol);
            const stock = await getStockDetails(symbol);

            const current = stock?.price ?? 0;
            const currentPrice = stock?.priceFormatted ?? (current ? formatPrice(current) : 'N/A');
            const changeText = stock?.changeFormatted ?? formatChangePercent(stock?.changePercent);
            const condition: '>' | '<' = alert.condition === '>' ? '>' : '<';
            const target = Number(alert.targetPrice);

            const isMet = condition === '>' ? current > target : current < target;
            const conditionTone: ConditionTone = isMet ? 'positive' : 'negative';

            return {
                id: String(alert._id),
                alertName: String(alert.alertName || `${symbol} Alert`),
                company,
                symbol,
                currentPrice,
                changeText: changeText || '',
                conditionText: `Price ${condition} $${target.toFixed(2)}`,
                conditionTone,
            };
        })
    );

    return (
        <section className='watchlist-container'>
            <div className='watchlist space-y-6'>
                <h1 className='watchlist-title'>Alerts</h1>
                <div className='alert-list'>
                    {enriched.map((card) => (
                        <AlertCard key={card.id} {...card} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AlertsPage;
