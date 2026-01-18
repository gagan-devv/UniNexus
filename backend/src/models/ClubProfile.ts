import mongoose, { Schema, Document } from 'mongoose';

export interface IClubProfile extends Document {
    user: mongoose.Types.ObjectId;
    name: string;
    description: string;
    email: string;
    logoUrl: string;
    socialLinks: {
        instagram?: string;
        linkedin?: string;
        website?: string;
        medium?: string;
        reddit?: string;
    };
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ClubProfileSchema = new Schema<IClubProfile>({
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    email: { type: String, required: true },
    logoUrl: { type: String, default: '' },
    socialLinks: {
        instagram: String,
        linkedin: String,
        website: String,
        medium: String,
        reddit: String
    },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const ClubProfile = mongoose.model<IClubProfile>('ClubProfile', ClubProfileSchema);