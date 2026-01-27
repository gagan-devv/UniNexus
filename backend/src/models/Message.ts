import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    recipientId: mongoose.Types.ObjectId;
    content: string;
    read: boolean;
    createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    senderId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    recipientId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        minlength: [1, 'Message content cannot be empty'],
        maxlength: [2000, 'Message content cannot exceed 2000 characters']
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound indexes for efficient conversation queries
MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
MessageSchema.index({ recipientId: 1, senderId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ recipientId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
