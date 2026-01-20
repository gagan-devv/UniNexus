import mongoose, { Schema, Document } from 'mongoose';

export interface IRSVP extends Document {
    user: mongoose.Types.ObjectId;
    event: mongoose.Types.ObjectId;
    status: 'going' | 'interested' | 'not_going' | 'waitlist';
    createdAt: Date;
    updatedAt: Date;
}

const RSVPSchema = new Schema<IRSVP>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    status: {
        type: String,
        enum: ['going', 'interested', 'not_going', 'waitlist'],
        required: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

RSVPSchema.pre('save', function() {
    this.updatedAt = new Date();
});

RSVPSchema.index({ user: 1, event: 1 }, { unique: true });
RSVPSchema.index({ event: 1, status: 1 });

export const RSVP = mongoose.model<IRSVP>('RSVP', RSVPSchema);