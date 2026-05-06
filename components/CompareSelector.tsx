'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchStocks } from '@/lib/actions/finnhub.actions';
import { useDebounce } from '@/hooks/useDebounce';

type CompareSelectorProps = {
    initialSymbols: string[];
    maxSelections?: number;
};

const CompareSelector = ({ initialSymbols, maxSelections = 5 }: CompareSelectorProps) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<StockWithWatchlistStatus[]>([]);
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>(
        initialSymbols.slice(0, maxSelections)
    );

    const canCompare = selectedSymbols.length >= 2;

    const runSearch = async () => {
        const trimmed = query.trim();
        if (!trimmed) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const results = await searchStocks(trimmed);
            setSearchResults(results);
        } catch {
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const debouncedSearch = useDebounce(runSearch, 250);

    useEffect(() => {
        debouncedSearch();
    }, [query, debouncedSearch]);

    const visibleResults = useMemo(
        () =>
            searchResults
                .filter((stock) => !selectedSymbols.includes(stock.symbol))
                .slice(0, 8),
        [searchResults, selectedSymbols]
    );

    const addSymbol = (symbol: string) => {
        if (selectedSymbols.includes(symbol)) return;
        if (selectedSymbols.length >= maxSelections) return;

        setSelectedSymbols((prev) => [...prev, symbol]);
        setQuery('');
        setSearchResults([]);
    };

    const removeSymbol = (symbol: string) => {
        setSelectedSymbols((prev) => prev.filter((item) => item !== symbol));
    };

    const applyComparison = () => {
        const params = new URLSearchParams();
        if (selectedSymbols.length > 0) {
            params.set('symbols', selectedSymbols.join(','));
        }

        router.push(`/compare?${params.toString()}`);
    };

    return (
        <div className='space-y-4 rounded-lg border border-gray-600 bg-gray-800 p-5'>
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                <div>
                    <h2 className='text-lg font-semibold text-gray-100'>Pick stocks to compare</h2>
                    <p className='text-sm text-gray-500'>
                        Select 2 to {maxSelections} stocks. Current: {selectedSymbols.length}
                    </p>
                </div>
                <Button
                    type='button'
                    className='yellow-btn h-10 px-4'
                    disabled={!canCompare}
                    onClick={applyComparison}
                >
                    Apply Comparison
                </Button>
            </div>

            <div className='relative'>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500' />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder='Search and add stock symbols'
                    className='pl-10'
                />
            </div>

            {loading ? <p className='text-sm text-gray-500'>Searching...</p> : null}

            {visibleResults.length > 0 ? (
                <ul className='grid gap-2'>
                    {visibleResults.map((stock) => (
                        <li
                            key={stock.symbol}
                            className='flex items-center justify-between rounded-md border border-gray-600 bg-gray-700/40 px-3 py-2'
                        >
                            <div className='min-w-0'>
                                <p className='truncate text-sm font-medium text-gray-100'>{stock.name}</p>
                                <p className='text-xs text-gray-500'>
                                    {stock.symbol} | {stock.exchange}
                                </p>
                            </div>
                            <Button
                                type='button'
                                variant='outline'
                                className='border-gray-500 bg-transparent text-gray-100 hover:bg-gray-700'
                                onClick={() => addSymbol(stock.symbol)}
                            >
                                Add
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : null}

            {selectedSymbols.length > 0 ? (
                <div className='flex flex-wrap gap-2 pt-1'>
                    {selectedSymbols.map((symbol) => (
                        <div
                            key={symbol}
                            className='inline-flex items-center gap-1 rounded-full border border-gray-600 bg-gray-700 px-3 py-1 text-sm text-gray-100'
                        >
                            <span>{symbol}</span>
                            <button
                                type='button'
                                className='rounded-full p-0.5 text-gray-500 hover:text-red-400'
                                onClick={() => removeSymbol(symbol)}
                                aria-label={`Remove ${symbol}`}
                            >
                                <X className='h-3.5 w-3.5' />
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export default CompareSelector;

