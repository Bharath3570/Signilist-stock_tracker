'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { WATCHLIST_TABLE_HEADER } from '@/lib/constants';
import { cn, getChangeColorClass } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import WatchlistButton from '@/components/WatchlistButton';
import CreateAlertModal from '@/components/CreateAlertModal';

export default function WatchlistTable({ watchlist }: WatchlistTableProps) {
    const router = useRouter();
    const [alertOpen, setAlertOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<{ symbol: string; company: string } | null>(null);

    return (
        <>
            {selectedStock ? (
                <CreateAlertModal
                    key={`${selectedStock.symbol}-${alertOpen ? 'open' : 'closed'}`}
                    open={alertOpen}
                    onOpenChange={(open) => {
                        setAlertOpen(open);
                        if (!open) setSelectedStock(null);
                    }}
                    symbol={selectedStock.symbol}
                    company={selectedStock.company}
                />
            ) : null}

            <Table className='watchlist-table'>
            <TableHeader>
                <TableRow className='table-header-row'>
                    {WATCHLIST_TABLE_HEADER.map((label) => (
                        <TableHead key={label} className='table-header px-4 py-4 text-sm'>
                            {label}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>

            <TableBody>
                {watchlist.map((item) => (
                    <TableRow
                        key={item.id}
                        className='table-row'
                        onClick={() => router.push(`/stocks/${encodeURIComponent(item.symbol)}`)}
                    >
                        <TableCell className='table-cell px-4 py-5'>{item.company}</TableCell>
                        <TableCell className='table-cell px-4 py-5'>{item.symbol}</TableCell>
                        <TableCell className='table-cell px-4 py-5'>{item.priceFormatted || 'N/A'}</TableCell>
                        <TableCell
                            className={cn(
                                'table-cell px-4 py-5',
                                getChangeColorClass(item.changePercent)
                            )}
                        >
                            {item.changeFormatted || 'N/A'}
                        </TableCell>
                        <TableCell className='table-cell px-4 py-5'>{item.marketCap || 'N/A'}</TableCell>
                        <TableCell className='table-cell px-4 py-5'>{item.peRatio || 'N/A'}</TableCell>
                        <TableCell className='px-4 py-5'>
                            <Button
                                type='button'
                                className='add-alert'
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setSelectedStock({ symbol: item.symbol, company: item.company });
                                    setAlertOpen(true);
                                }}
                            >
                                Add Alert
                            </Button>
                        </TableCell>
                        <TableCell className='px-4 py-5'>
                            <WatchlistButton
                                symbol={item.symbol}
                                company={item.company}
                                isInWatchlist={true}
                                showTrashIcon
                                type='icon'
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
            </Table>
        </>
    );
}
