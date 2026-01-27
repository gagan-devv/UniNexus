import mongoose, { Schema, Document } from 'mongoose';

export interface IClubProfile extends Document {
    user: mongoose.Types.ObjectId;
    name: string;
    description: string;
    email: string;
    logoUrl?: string;
    logo?: {
        s3Key: string;
        uploadedAt: Date;
    };
    stats?: {
        memberCount: number;
        eventCount: number;
        engagementScore: number;
    };
    socialLinks: {
        instagram?: string;
        linkedin?: string;
        website?: string;
        medium?: string;
        reddit?: string;
        twitter?: string;
        facebook?: string;
    };
    isVerified: boolean;
    verificationStatus: 'pending' | 'approved' | 'rejected';
    verificationNotes?: string;
    category?: string;
    foundedYear?: number;
    memberCount?: number;
    contactPhone?: string;
    createdAt: Date;
    updatedAt: Date;
}

// URL validation regex
const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

// Social media specific URL patterns
const socialMediaPatterns = {
    instagram: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/,
    linkedin: /^https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9-]+\/?$/,
    twitter: /^https?:\/\/(www\.)?twitter\.com\/[a-zA-Z0-9_]+\/?$/,
    facebook: /^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+\/?$/,
    medium: /^https?:\/\/(www\.)?medium\.com\/@?[a-zA-Z0-9._-]+\/?$/,
    reddit: /^https?:\/\/(www\.)?reddit\.com\/(r|u)\/[a-zA-Z0-9_-]+\/?$/
};

const ClubProfileSchema = new Schema<IClubProfile>({
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        unique: true,
        index: true
    },
    name: { 
        type: String, 
        required: true,
        trim: true,
        minlength: [2, 'Club name must be at least 2 characters long'],
        maxlength: [100, 'Club name cannot exceed 100 characters']
    },
    description: { 
        type: String, 
        required: true,
        trim: true,
        minlength: [10, 'Description must be at least 10 characters long'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    email: { 
        type: String, 
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },
    logoUrl: { 
        type: String,
        trim: true,
        validate: {
            validator: function(v: string) {
                return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i.test(v);
            },
            message: 'Logo URL must be a valid image URL (jpg, jpeg, png, gif, webp, svg)'
        }
    },
    logo: {
        s3Key: {
            type: String,
            trim: true
        },
        uploadedAt: {
            type: Date
        }
    },
    stats: {
        memberCount: {
            type: Number,
            default: 0,
            min: [0, 'Member count cannot be negative']
        },
        eventCount: {
            type: Number,
            default: 0,
            min: [0, 'Event count cannot be negative']
        },
        engagementScore: {
            type: Number,
            default: 0,
            min: [0, 'Engagement score cannot be negative']
        }
    },
    socialLinks: {
        instagram: {
            type: String,
            trim: true,
            validate: {
                validator: function(v: string) {
                    return !v || socialMediaPatterns.instagram.test(v);
                },
                message: 'Instagram URL must be a valid Instagram profile URL'
            }
        },
        linkedin: {
            type: String,
            trim: true,
            validate: {
                validator: function(v: string) {
                    return !v || socialMediaPatterns.linkedin.test(v);
                },
                message: 'LinkedIn URL must be a valid LinkedIn company or profile URL'
            }
        },
        website: {
            type: String,
            trim: true,
            validate: {
                validator: function(v: string) {
                    return !v || urlRegex.test(v);
                },
                message: 'Website URL must be a valid URL'
            }
        },
        twitter: {
            type: String,
            trim: true,
            validate: {
                validator: function(v: string) {
                    return !v || socialMediaPatterns.twitter.test(v);
                },
                message: 'Twitter URL must be a valid Twitter profile URL'
            }
        },
        facebook: {
            type: String,
            trim: true,
            validate: {
                validator: function(v: string) {
                    return !v || socialMediaPatterns.facebook.test(v);
                },
                message: 'Facebook URL must be a valid Facebook page URL'
            }
        },
        medium: {
            type: String,
            trim: true,
            validate: {
                validator: function(v: string) {
                    return !v || socialMediaPatterns.medium.test(v);
                },
                message: 'Medium URL must be a valid Medium profile URL'
            }
        },
        reddit: {
            type: String,
            trim: true,
            validate: {
                validator: function(v: string) {
                    return !v || socialMediaPatterns.reddit.test(v);
                },
                message: 'Reddit URL must be a valid Reddit community or user URL'
            }
        }
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    verificationNotes: {
        type: String,
        trim: true,
        maxlength: [500, 'Verification notes cannot exceed 500 characters']
    },
    category: {
        type: String,
        trim: true,
        enum: [
            'Academic',
            'Arts & Culture',
            'Business & Entrepreneurship',
            'Community Service',
            'Environmental',
            'Health & Wellness',
            'Hobby & Interest',
            'Political',
            'Professional',
            'Religious & Spiritual',
            'Sports & Recreation',
            'Technology',
            'Other'
        ]
    },
    foundedYear: {
        type: Number,
        min: [1800, 'Founded year must be after 1800'],
        max: [new Date().getFullYear(), 'Founded year cannot be in the future'],
        validate: {
            validator: Number.isInteger,
            message: 'Founded year must be an integer'
        }
    },
    memberCount: {
        type: Number,
        min: [0, 'Member count cannot be negative'],
        validate: {
            validator: Number.isInteger,
            message: 'Member count must be an integer'
        }
    },
    contactPhone: {
        type: String,
        trim: true,
        validate: {
            validator: function(v: string) {
                return !v || /^[+]?[1-9][\d]{0,15}$/.test(v.replace(/[\s\-()]/g, ''));
            },
            message: 'Please enter a valid phone number'
        }
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

// Pre-save middleware to update timestamps and sync verification status
ClubProfileSchema.pre('save', function() {
    this.updatedAt = new Date();
    
    // Sync isVerified with verificationStatus
    this.isVerified = this.verificationStatus === 'approved';
});

// Instance methods for verification management
ClubProfileSchema.methods.approve = function(notes?: string) {
    this.verificationStatus = 'approved';
    this.isVerified = true;
    if (notes) this.verificationNotes = notes;
    return this.save();
};

ClubProfileSchema.methods.reject = function(notes: string) {
    this.verificationStatus = 'rejected';
    this.isVerified = false;
    this.verificationNotes = notes;
    return this.save();
};

ClubProfileSchema.methods.resetVerification = function() {
    this.verificationStatus = 'pending';
    this.isVerified = false;
    this.verificationNotes = undefined;
    return this.save();
};

// Static methods for querying
ClubProfileSchema.statics.findVerified = function() {
    return this.find({ isVerified: true });
};

ClubProfileSchema.statics.findPendingVerification = function() {
    return this.find({ verificationStatus: 'pending' });
};

ClubProfileSchema.statics.findByCategory = function(category: string) {
    return this.find({ category });
};

// Indexes for performance
ClubProfileSchema.index({ name: 'text', description: 'text' });
ClubProfileSchema.index({ category: 1 });
ClubProfileSchema.index({ verificationStatus: 1 });
ClubProfileSchema.index({ isVerified: 1 });

export const ClubProfile = mongoose.model<IClubProfile>('ClubProfile', ClubProfileSchema);