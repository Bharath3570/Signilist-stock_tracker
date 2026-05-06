import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface InsightDocument extends Document {
    userEmail: string;
    dateKey: string;
    symbols: string[];
    payload: unknown;
    createdAt: Date;
    updatedAt: Date;
}

const InsightSchema = new Schema<InsightDocument>(
    {
        userEmail: { type: String, required: true, index: true, trim: true, lowercase: true },
        dateKey: { type: String, required: true, index: true, trim: true },
        symbols: { type: [String], default: [], required: true },
        payload: { type: Schema.Types.Mixed, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

InsightSchema.index({ userEmail: 1, dateKey: 1 }, { unique: true });

export const Insight: Model<InsightDocument> =
    (models?.Insight as Model<InsightDocument>) || model<InsightDocument>('Insight', InsightSchema);

