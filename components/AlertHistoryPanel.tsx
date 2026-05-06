type AlertHistoryItem = {
    _id: string;
    alertName: string;
    symbol: string;
    company?: string;
    condition: '>' | '<';
    targetPrice: number;
    triggerPrice: number;
    triggeredAt: string;
};

const formatTriggeredAt = (value: string) =>
    new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

export default function AlertHistoryPanel({ history }: { history: AlertHistoryItem[] }) {
    return (
        <div className='rounded-xl border border-gray-700 bg-gray-900/35 p-5'>
            <div className='mb-4'>
                <h2 className='text-lg font-semibold text-gray-100'>Recent Alert History</h2>
                <p className='text-sm text-gray-500'>
                    Every triggered alert is logged here so you can show proof of automation in your project demo.
                </p>
            </div>

            {history.length === 0 ? (
                <div className='rounded-lg border border-dashed border-gray-700 p-4 text-sm text-gray-500'>
                    No alerts have triggered yet.
                </div>
            ) : (
                <div className='space-y-3'>
                    {history.map((item) => (
                        <div key={item._id} className='rounded-lg border border-gray-700 bg-gray-950/30 p-4'>
                            <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                                <div>
                                    <h3 className='font-semibold text-gray-100'>{item.alertName}</h3>
                                    <p className='mt-1 text-sm text-gray-400'>
                                        {item.company || item.symbol} ({item.symbol})
                                    </p>
                                    <p className='mt-2 text-sm text-gray-300'>
                                        Triggered when price {item.condition} ${item.targetPrice.toFixed(2)} and reached $
                                        {item.triggerPrice.toFixed(2)}.
                                    </p>
                                </div>
                                <div className='text-sm text-gray-500'>{formatTriggeredAt(item.triggeredAt)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
