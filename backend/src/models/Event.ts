import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    embeddings?: number[];
    posterUrl?: string;
    poster?: {
        s3Key: string;
        uploadedAt: Date;
    };
    stats?: {
        attendeeCount: number;
        viewCount: number;
        engagementScore: number;
    };
    location: string;
    category: 'Tech' | 'Cultural' | 'Sports' | 'Workshop' | 'Seminar' | 'Other';
    organizer: mongoose.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    maxAttendees?: number;
    tags: string[];
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const EventSchema = new Schema<IEvent>({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: [1, 'Title must be at least 1 character'],
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    embeddings: {
        type: [Number],
        validate: {
            validator: function (v: number[]) {
                return !v || v.length <= 1536;
            },
            message: 'Embeddings array cannot exceed 1536 dimensions',
        },
    },
    posterUrl: {
        type: String,
        trim: true,
        validate: {
            validator: function (v: string) {
                return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
            },
            message: 'Poster URL must be a valid image URL',
        },
    },
    poster: {
        s3Key: {
            type: String,
            trim: true
        },
        uploadedAt: {
            type: Date
        }
    },
    stats: {
        attendeeCount: {
            type: Number,
            default: 0,
            min: [0, 'Attendee count cannot be negative']
        },
        viewCount: {
            type: Number,
            default: 0,
            min: [0, 'View count cannot be negative']
        },
        engagementScore: {
            type: Number,
            default: 0,
            min: [0, 'Engagement score cannot be negative']
        }
    },
    location: {
        type: String,
        required: true,
        trim: true,
        minlength: [1, 'Location must be at least 1 character'],
        maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    category: {
        type: String,
        enum: ['Tech', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'],
        required: true,
        default: 'Other',
    },
    organizer: {
        type: Schema.Types.ObjectId,
        ref: 'ClubProfile',
        required: true,
        index: true,
    },
    startTime: {
        type: Date,
        required: true,
        validate: {
            validator: function (v: Date) {
                return v > new Date();
            },
            message: 'Start time must be in the future',
        },
    },
    endTime: {
        type: Date,
        required: true,
        validate: {
            validator: function (v: Date) {
                return v > (this as unknown as IEvent).startTime;
            },
            message: 'End time must be after start time',
        },
    },
    maxAttendees: {
        type: Number,
        min: [1, 'Maximum attendees must be at least 1'],
        max: [10000, 'Maximum attendees cannot exceed 10000'],
        validate: {
            validator: Number.isInteger,
            message: 'Maximum attendees must be an integer',
        },
    },
    tags: {
        type: [String],
        default: [],
        validate: {
            validator: function (v: string[]) {
                return v.length <= 10;
            },
            message: 'Cannot have more than 10 tags',
        },
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

EventSchema.pre('save', function () {
    this.updatedAt = new Date();

    if (this.tags) {
        this.tags = this.tags
            .map((tag) => tag.trim().toLowerCase())
            .filter((tag) => tag.length > 0);
    }
});

EventSchema.index({ category: 1, startTime: 1 });
EventSchema.index({ organizer: 1, startTime: -1 });
EventSchema.index({ startTime: 1, endTime: 1 });
EventSchema.index({ isPublic: 1, startTime: 1 });
EventSchema.index({ tags: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
