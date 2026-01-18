import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    username: string;
    email: string;
    password: string;
    role: 'student' | 'admin';
    createdAt: Date;
    updatedAt: Date;
};

const UserSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const User = mongoose.model<IUser>('User', UserSchema);