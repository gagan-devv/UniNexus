import mongoose, { Schema, Document } from 'mongoose';

interface IEvent extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    emeddings?: number[];
    posterUrl: string;
    location: string;
    category: 'Tech' | 'Cultural' | 'Sports' | 'Workshop' | 'Seminar' | 'Other';
    organizer: mongoose.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    createdAt: Date;
    updatedAt: Date;
};

const EventSchema = new Schema<IEvent>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    emeddings: { type: [Number], required: true },
    posterUrl: { type: String, required: true },
    location: { type: String, required: true },
    category: {
        type: String,
        enum: ['Tech', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'],
        required: true,
        default: 'Other'
    },
    organizer: { type: Schema.Types.ObjectId, ref: 'ClubProfile', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const Event = mongoose.model<IEvent>('Event', EventSchema);