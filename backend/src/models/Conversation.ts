import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
    _id: mongoose.Types.ObjectId;
    participants: mongoose.Types.ObjectId[];
    lastMessageAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Pre-save middleware to update timestamps
ConversationSchema.pre('save', function() {
    this.updatedAt = new Date();
});

// Indexes for performance
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

// Validation: Must have at least 2 participants
ConversationSchema.path('participants').validate(function(value: mongoose.Types.ObjectId[]) {
    return value && value.length >= 2;
}, 'Conversation must have at least 2 participants');

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
