'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createAlert } from '@/lib/actions/alert.actions';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    symbol: string;
    company: string;
};

export default function CreateAlertModal({ open, onOpenChange, symbol, company }: Props) {
    const [isPending, startTransition] = useTransition();
    const [alertName, setAlertName] = useState(() => `${company || symbol} Alert`);
    const [condition, setCondition] = useState<'>' | '<'>('>');
    const [targetPrice, setTargetPrice] = useState<string>('');

    const submit = () => {
        startTransition(async () => {
            const priceValue = Number(targetPrice);

            const result = await createAlert({
                symbol,
                company,
                alertName,
                condition,
                targetPrice: priceValue,
            });

            if (!result.success) {
                toast.error(result.error ?? 'Failed to create alert');
                return;
            }

            toast.success('Alert created', {
                description: `${symbol} ${condition} ${targetPrice}`,
            });

            onOpenChange(false);
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='alert-dialog'>
                <DialogHeader>
                    <DialogTitle className='alert-title'>Create Price Alert</DialogTitle>
                </DialogHeader>

                <div className='space-y-5'>
                    <div className='space-y-2'>
                        <label className='form-label'>Alert Name</label>
                        <Input
                            value={alertName}
                            onChange={(e) => setAlertName(e.target.value)}
                            className='form-input'
                            placeholder='Alphabet Inc Alert'
                        />
                    </div>

                    <div className='space-y-2'>
                        <label className='form-label'>Stock Identifier</label>
                        <Input value={symbol} disabled className='form-input opacity-70' />
                    </div>

                    <div className='space-y-2'>
                        <label className='form-label'>Alert type</label>
                        <Select value='price' onValueChange={() => undefined}>
                            <SelectTrigger className='select-trigger w-full'>
                                <SelectValue placeholder='Price' />
                            </SelectTrigger>
                            <SelectContent className='bg-gray-800 border-gray-600 text-gray-400'>
                                <SelectItem value='price'>Price</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className='space-y-2'>
                        <label className='form-label'>Condition</label>
                        <Select value={condition} onValueChange={(value) => setCondition(value as '>' | '<')}>
                            <SelectTrigger className='select-trigger w-full'>
                                <SelectValue placeholder='Greater than (>)' />
                            </SelectTrigger>
                            <SelectContent className='bg-gray-800 border-gray-600 text-gray-400'>
                                <SelectItem value='>'>Greater than (&gt;)</SelectItem>
                                <SelectItem value='<'>{'Less than (<)'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className='space-y-2'>
                        <label className='form-label'>Target Price</label>
                        <Input
                            type='number'
                            inputMode='decimal'
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            className='form-input'
                            placeholder='252.03'
                        />
                    </div>

                    <Button
                        type='button'
                        disabled={isPending}
                        className='yellow-btn w-full h-12'
                        onClick={submit}
                    >
                        {isPending ? 'Creating...' : 'Create Alert'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
