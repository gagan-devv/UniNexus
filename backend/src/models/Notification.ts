import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type: 'event' | 'club' | 'message' | 'system';
    title: string;
    content: string;
    relatedId?: mongoose.Types.ObjectId;
    relatedType?: string;
    read: boolean;
    createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['event', 'club', 'message', 'system'],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: [1000, 'Content cannot exceed 1000 characters']
    },
    relatedId: {
        type: Schema.Types.ObjectId
    },
    relatedType: {
        type: String,
        enum: ['event', 'club', 'message', 'user'],
        trim: true
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
