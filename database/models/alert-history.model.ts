import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface AlertHistoryDocument extends Document {
    userEmail: string;
    alertId: string;
    alertName: string;
    symbol: string;
    company?: string;
    condition: '>' | '<';
    targetPrice: number;
    triggerPrice: number;
    triggeredAt: Date;
}

const AlertHistorySchema = new Schema<AlertHistoryDocument>(
    {
        userEmail: { type: String, required: true, index: true, trim: true, lowercase: true },
        alertId: { type: String, required: true, index: true, trim: true },
        alertName: { type: String, required: true, trim: true },
        symbol: { type: String, required: true, uppercase: true, trim: true, index: true },
        company: { type: String, required: false, trim: true },
        condition: { type: String, enum: ['>', '<'], required: true },
        targetPrice: { type: Number, required: true },
        triggerPrice: { type: Number, required: true },
        triggeredAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: false }
);

export const AlertHistory: Model<AlertHistoryDocument> =
    (models?.AlertHistory as Model<AlertHistoryDocument>) ||
    model<AlertHistoryDocument>('AlertHistory', AlertHistorySchema);
