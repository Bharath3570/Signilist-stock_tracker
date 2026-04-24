'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addToWatchlist, removeFromWatchlist } from '@/lib/actions/watchlist.actions';

const WatchlistButton = ({
    symbol,
    company,
    isInWatchlist,
    showTrashIcon = false,
    type = 'button',
    onWatchlistChange,
}: WatchlistButtonProps) => {
    const [added, setAdded] = useState(!!isInWatchlist);
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    const label = type === 'icon' ? '' : added ? 'Remove from Watchlist' : 'Add to Watchlist';

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (isPending) return;

        const nextValue = !added;
        setIsPending(true);
        setAdded(nextValue);
        onWatchlistChange?.(symbol, nextValue);

        try {
            const result = nextValue
                ? await addToWatchlist(symbol, company)
                : await removeFromWatchlist(symbol);

            if (!result.success) {
                setAdded(!nextValue);
                onWatchlistChange?.(symbol, !nextValue);
                toast.error(result.error ?? 'Unable to update watchlist');
                return;
            }

            toast.success(nextValue ? 'Added to watchlist' : 'Removed from watchlist', {
                description: `${company} ${nextValue ? 'is now in' : 'was removed from'} your watchlist.`,
            });

            router.refresh();
        } catch (error) {
            setAdded(!nextValue);
            onWatchlistChange?.(symbol, !nextValue);
            toast.error(error instanceof Error ? error.message : 'Unable to update watchlist');
        } finally {
            setIsPending(false);
        }
    };

    if (type === 'icon') {
        return (
            <button
                type='button'
                title={added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
                aria-label={added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
                className={`watchlist-icon-btn ${added ? 'watchlist-icon-added' : ''}`}
                onClick={handleClick}
                disabled={isPending}
            >
                <Star className='h-6 w-6' fill={added ? 'currentColor' : 'none'} />
            </button>
        );
    }

    return (
        <button
            type='button'
            className={`watchlist-btn flex items-center justify-center gap-2 ${added ? 'watchlist-remove' : ''}`}
            onClick={handleClick}
            disabled={isPending}
        >
            {showTrashIcon && added ? <Trash2 className='h-4 w-4' /> : null}
            <span>{label}</span>
        </button>
    );
};

export default WatchlistButton;
