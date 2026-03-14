import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
    _id: mongoose.Types.ObjectId;
    content: string;
    author: mongoose.Types.ObjectId;
    eventId: mongoose.Types.ObjectId;
    parentId: mongoose.Types.ObjectId | null;
    path: string;
    depth: number;
    
    // Voting
    upvotes: mongoose.Types.ObjectId[];
    downvotes: mongoose.Types.ObjectId[];
    voteCount: number;
    
    // Moderation
    isDeleted: boolean;
    deletedBy: mongoose.Types.ObjectId | null;
    deletedAt: Date | null;
    moderationReason: string | null;
    
    // Metadata
    isEdited: boolean;
    editedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
    content: {
        type: String,
        required: true,
        trim: true,
        minlength: [1, 'Comment content cannot be empty'],
        maxlength: [2000, 'Comment content cannot exceed 2000 characters']
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventId: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    parentId: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    path: {
        type: String,
        default: ''
    },
    depth: {
        type: Number,
        default: 0,
        min: [0, 'Depth cannot be negative']
    },
    
    // Voting
    upvotes: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    downvotes: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    voteCount: {
        type: Number,
        default: 0
    },
    
    // Moderation
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    deletedAt: {
        type: Date,
        default: null
    },
    moderationReason: {
        type: String,
        default: null,
        maxlength: [500, 'Moderation reason cannot exceed 500 characters']
    },
    
    // Metadata
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to update timestamps
CommentSchema.pre('save', function() {
    this.updatedAt = new Date();
});

// Indexes for efficient comment fetching and sorting
CommentSchema.index({ eventId: 1, path: 1 });
CommentSchema.index({ eventId: 1, voteCount: -1 });
CommentSchema.index({ eventId: 1, createdAt: -1 });
CommentSchema.index({ eventId: 1, depth: 1 }); // For lazy loading with maxDepth
CommentSchema.index({ author: 1 });
CommentSchema.index({ path: 1 }); // For finding children by path prefix

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
