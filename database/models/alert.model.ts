import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface AlertDocument extends Document {
    userEmail: string;
    symbol: string;
    company?: string;
    alertName: string;
    condition: '>' | '<';
    targetPrice: number;
    isActive: boolean;
    createdAt: Date;
    lastTriggeredAt?: Date;
}

const AlertSchema = new Schema<AlertDocument>(
    {
        userEmail: { type: String, required: true, index: true, trim: true, lowercase: true },
        symbol: { type: String, required: true, uppercase: true, trim: true, index: true },
        company: { type: String, required: false, trim: true },
        alertName: { type: String, required: true, trim: true },
        condition: { type: String, enum: ['>', '<'], required: true },
        targetPrice: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        lastTriggeredAt: { type: Date, required: false },
    },
    { timestamps: false }
);

// Prevent duplicate alerts for the same user/symbol/condition/price.
AlertSchema.index({ userEmail: 1, symbol: 1, condition: 1, targetPrice: 1 }, { unique: true });

export const Alert: Model<AlertDocument> =
    (models?.Alert as Model<AlertDocument>) || model<AlertDocument>('Alert', AlertSchema);

