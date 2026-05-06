import InsightsPanel from '@/components/InsightsPanel';
import { getDailyInsights } from '@/lib/actions/insights.actions';

export const dynamic = 'force-dynamic';

const InsightsPage = async () => {
    const result = await getDailyInsights();

    if (!result.ok) {
        return (
            <section className='watchlist-empty-container flex'>
                <div className='watchlist-empty'>
                    <h2 className='empty-title'>AI Insights unavailable</h2>
                    <p className='empty-description'>{result.error}</p>
                </div>
            </section>
        );
    }

    return (
        <section className='watchlist-container'>
            <div className='watchlist'>
                <InsightsPanel initial={result.payload} used={result.used} cached={result.cached} />
            </div>
        </section>
    );
};

export default InsightsPage;

