import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    action: string;
    actorId: mongoose.Types.ObjectId;
    targetUserId?: mongoose.Types.ObjectId;
    clubId: mongoose.Types.ObjectId;
    details?: Record<string, unknown>;
    timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
    action: {
        type: String,
        required: true,
        enum: ['member_added', 'member_removed', 'role_changed'],
        index: true
    },
    actorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    targetUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    clubId: {
        type: Schema.Types.ObjectId,
        ref: 'ClubProfile',
        required: true,
        index: true
    },
    details: {
        type: Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for querying logs by club and time
AuditLogSchema.index({ clubId: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
