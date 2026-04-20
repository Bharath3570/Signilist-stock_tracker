"use client";

import WatchlistTable from "@/components/WatchlistTable";
import { removeFromWatchlist } from "@/actions/watchlist.actions";
import { useRouter } from "next/navigation";

export default function WatchlistClient({ data }) {
    const router = useRouter();

    const handleRemove = async (symbol: string) => {
        await removeFromWatchlist(symbol);
        router.refresh();
    };

    if (!data || data.length === 0) {
        return (
            <div className="flex justify-center items-center h-[60vh] text-gray-500">
                Your watchlist is empty 📉
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">My Watchlist</h1>

            <WatchlistTable data={data} onRemove={handleRemove} />
        </div>
    );
}