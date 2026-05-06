import { Schema, model, models, type Document, type Model } from 'mongoose';

export interface NotificationDocument extends Document {
    userEmail: string;
    title: string;
    message: string;
    category: 'watchlist' | 'alert' | 'system';
    href?: string;
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>(
    {
        userEmail: { type: String, required: true, index: true, trim: true, lowercase: true },
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        category: { type: String, enum: ['watchlist', 'alert', 'system'], required: true },
        href: { type: String, required: false, trim: true },
        isRead: { type: Boolean, default: false, index: true },
        createdAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: false }
);

export const Notification: Model<NotificationDocument> =
    (models?.Notification as Model<NotificationDocument>) ||
    model<NotificationDocument>('Notification', NotificationSchema);
