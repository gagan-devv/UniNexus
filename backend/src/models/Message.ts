import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    conversationId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    content: string;
    timestamp: Date;
    read: boolean;
}

const MessageSchema = new Schema<IMessage>({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    senderId: {
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
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    read: {
        type: Boolean,
        default: false
    }
});

// Compound indexes for efficient queries
MessageSchema.index({ conversationId: 1, timestamp: 1 });
MessageSchema.index({ senderId: 1, timestamp: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
