import mongoose, { Schema, Document, mongo} from "mongoose";

export interface IUser extends Document {
    username: string;
    email: string;
    password?: string;
    role: 'student' |  'club' | 'admin';
    clubDetails?: {
        description: string;
        logoUrl: string;
        socilaLinks: {
            instagram?: string,
            linkedin?: string,
            website?: string,
            medium?: string
        }
    };
    rsvps: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
};

const UserSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['student', 'club', 'admin'],
        default: 'student'
    },
    clubDetails: {
        description: String,
        logoUrl: String,
        socialLinks: {
            instagram: String,
            linkedin: String,
            website: String,
            medium: String
        }
    },
    rsvps: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const User = mongoose.model<IUser>('User', UserSchema);