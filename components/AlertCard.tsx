'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteAlert } from '@/lib/actions/alert.actions';
import CreateAlertModal from '@/components/CreateAlertModal';

type Props = {
    id: string;
    alertName: string;
    company: string;
    symbol: string;
    currentPrice: string;
    changeText: string;
    conditionText: string;
    conditionTone: 'positive' | 'negative';
    condition: '>' | '<';
    targetPrice: number;
};

export default function AlertCard({
    id,
    alertName,
    company,
    symbol,
    currentPrice,
    changeText,
    conditionText,
    conditionTone,
    condition,
    targetPrice,
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [editOpen, setEditOpen] = useState(false);

    const onDelete = () => {
        startTransition(async () => {
            const result = await deleteAlert(id);
            if (!result.success) {
                toast.error(result.error ?? 'Failed to delete alert');
                return;
            }
            toast.success('Alert deleted');
        });
    };

    return (
        <>
            <CreateAlertModal
                key={`${id}-${editOpen ? 'open' : 'closed'}`}
                open={editOpen}
                onOpenChange={setEditOpen}
                symbol={symbol}
                company={company}
                mode='edit'
                alertId={id}
                initialAlertName={alertName}
                initialCondition={condition}
                initialTargetPrice={targetPrice}
            />

            <article className='alert-item'>
                <div className='alert-name'>{alertName}</div>

                <div className='alert-details'>
                    <div>
                        <div className='alert-company'>{company}</div>
                        <div className='mt-2 flex items-center justify-between gap-3 text-sm text-gray-500'>
                            <span className='font-medium text-gray-400'>{currentPrice}</span>
                            <span className='text-gray-500'>{symbol}</span>
                        </div>
                    </div>
                    <div className='text-sm font-semibold text-gray-400'>{changeText}</div>
                </div>

                <div className='alert-actions'>
                    <div className='text-sm text-gray-500'>
                        Alert at:{' '}
                        <span className={conditionTone === 'positive' ? 'text-teal-400 font-semibold' : 'text-red-500 font-semibold'}>
                            {conditionText}
                        </span>
                    </div>

                    <div className='flex items-center gap-2'>
                        <button
                            type='button'
                            className='alert-update-btn p-2'
                            onClick={() => setEditOpen(true)}
                            disabled={isPending}
                            aria-label='Edit alert'
                            title='Edit'
                        >
                            <Pencil className='h-4 w-4' />
                        </button>
                        <button
                            type='button'
                            className='alert-delete-btn p-2'
                            onClick={onDelete}
                            disabled={isPending}
                            aria-label='Delete alert'
                            title='Delete'
                        >
                            <Trash2 className='h-4 w-4' />
                        </button>
                    </div>
                </div>
            </article>
        </>
    );
}
