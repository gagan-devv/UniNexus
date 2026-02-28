import mongoose, { Schema, Document } from 'mongoose';

export interface IClubMember extends Document {
    userId: mongoose.Types.ObjectId;
    clubId: mongoose.Types.ObjectId;
    joinedAt: Date;
}

const ClubMemberSchema = new Schema<IClubMember>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    clubId: {
        type: Schema.Types.ObjectId,
        ref: 'ClubProfile',
        required: true,
        index: true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure a user can only join a club once
ClubMemberSchema.index({ userId: 1, clubId: 1 }, { unique: true });

// Index for querying members by club
ClubMemberSchema.index({ clubId: 1, joinedAt: -1 });

export const ClubMember = mongoose.model<IClubMember>('ClubMember', ClubMemberSchema);
