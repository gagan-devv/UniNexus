export interface CreateClubProfileInput {
    name: string;
    description: string;
    email: string;
    logoUrl?: string | undefined;
    socialLinks?: {
        instagram?: string | undefined;
        linkedin?: string | undefined;
        website?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
        medium?: string | undefined;
        reddit?: string | undefined;
    } | undefined;
    category?: string | undefined;
    foundedYear?: number | undefined;
    memberCount?: number | undefined;
    contactPhone?: string | undefined;
}

export interface UpdateClubProfileInput {
    name?: string | undefined;
    description?: string | undefined;
    email?: string | undefined;
    logoUrl?: string | undefined;
    socialLinks?: {
        instagram?: string | undefined;
        linkedin?: string | undefined;
        website?: string | undefined;
        twitter?: string | undefined;
        facebook?: string | undefined;
        medium?: string | undefined;
        reddit?: string | undefined;
    } | undefined;
    category?: string | undefined;
    foundedYear?: number | undefined;
    memberCount?: number | undefined;
    contactPhone?: string | undefined;
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

const validCategories = [
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
];

export const validateCreateClubProfileInput = (input: unknown): { isValid: boolean; errors: string[]; data?: CreateClubProfileInput } => {
    const errors: string[] = [];
    
    // Type guard: ensure input is an object
    if (!input || typeof input !== 'object') {
        errors.push('Input must be an object');
        return { isValid: false, errors };
    }
    
    const inputObj = input as Record<string, unknown>;
    
    // Required fields validation
    if (!inputObj.name || typeof inputObj.name !== 'string') {
        errors.push('Club name is required and must be a string');
    } else if (inputObj.name.trim().length < 2 || inputObj.name.trim().length > 100) {
        errors.push('Club name must be between 2 and 100 characters');
    }
    
    if (!inputObj.description || typeof inputObj.description !== 'string') {
        errors.push('Description is required and must be a string');
    } else if (inputObj.description.trim().length < 10 || inputObj.description.trim().length > 1000) {
        errors.push('Description must be between 10 and 1000 characters');
    }
    
    if (!inputObj.email || typeof inputObj.email !== 'string') {
        errors.push('Email is required and must be a string');
    } else {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(inputObj.email.trim())) {
            errors.push('Please enter a valid email address');
        }
    }
    
    // Optional fields validation
    if (inputObj.logoUrl && typeof inputObj.logoUrl === 'string') {
        const logoRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i;
        if (!logoRegex.test(inputObj.logoUrl.trim())) {
            errors.push('Logo URL must be a valid image URL (jpg, jpeg, png, gif, webp, svg)');
        }
    }
    
    if (inputObj.category && typeof inputObj.category === 'string') {
        if (!validCategories.includes(inputObj.category)) {
            errors.push(`Category must be one of: ${validCategories.join(', ')}`);
        }
    }
    
    if (inputObj.foundedYear !== undefined) {
        if (!Number.isInteger(inputObj.foundedYear) || 
            (inputObj.foundedYear as number) < 1800 || 
            (inputObj.foundedYear as number) > new Date().getFullYear()) {
            errors.push('Founded year must be an integer between 1800 and current year');
        }
    }
    
    if (inputObj.memberCount !== undefined) {
        if (!Number.isInteger(inputObj.memberCount) || (inputObj.memberCount as number) < 0) {
            errors.push('Member count must be a non-negative integer');
        }
    }
    
    if (inputObj.contactPhone && typeof inputObj.contactPhone === 'string') {
        const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
        const cleanPhone = inputObj.contactPhone.replace(/[\s\-()]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            errors.push('Please enter a valid phone number');
        }
    }
    
    // Social links validation
    if (inputObj.socialLinks && typeof inputObj.socialLinks === 'object') {
        const socialLinks = inputObj.socialLinks as Record<string, unknown>;
        
        Object.entries(socialLinks).forEach(([platform, url]) => {
            if (url && typeof url === 'string') {
                const pattern = socialMediaPatterns[platform as keyof typeof socialMediaPatterns];
                if (platform === 'website') {
                    if (!urlRegex.test(url)) {
                        errors.push('Website URL must be a valid URL');
                    }
                } else if (pattern && !pattern.test(url)) {
                    errors.push(`${platform} URL must be a valid ${platform} URL`);
                }
            }
        });
    }
    
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    
    const data: CreateClubProfileInput = {
        name: (inputObj.name as string).trim(),
        description: (inputObj.description as string).trim(),
        email: (inputObj.email as string).trim().toLowerCase()
    };

    // Add optional fields only if they exist
    if (inputObj.logoUrl && typeof inputObj.logoUrl === 'string') {
        data.logoUrl = inputObj.logoUrl.trim();
    }
    if (inputObj.socialLinks && typeof inputObj.socialLinks === 'object') {
        data.socialLinks = inputObj.socialLinks as CreateClubProfileInput['socialLinks'];
    }
    if (inputObj.category && typeof inputObj.category === 'string') {
        data.category = inputObj.category;
    }
    if (inputObj.foundedYear && typeof inputObj.foundedYear === 'number') {
        data.foundedYear = inputObj.foundedYear;
    }
    if (inputObj.memberCount !== undefined && typeof inputObj.memberCount === 'number') {
        data.memberCount = inputObj.memberCount;
    }
    if (inputObj.contactPhone && typeof inputObj.contactPhone === 'string') {
        data.contactPhone = inputObj.contactPhone.trim();
    }

    return {
        isValid: true,
        errors: [],
        data
    };
};

export const validateUpdateClubProfileInput = (input: unknown): { isValid: boolean; errors: string[]; data?: UpdateClubProfileInput } => {
    const errors: string[] = [];
    
    // Type guard: ensure input is an object
    if (!input || typeof input !== 'object') {
        errors.push('Input must be an object');
        return { isValid: false, errors };
    }
    
    const inputObj = input as Record<string, unknown>;
    
    // All fields are optional for updates, but validate if provided
    if (inputObj.name !== undefined) {
        if (typeof inputObj.name !== 'string' || inputObj.name.trim().length < 2 || inputObj.name.trim().length > 100) {
            errors.push('Club name must be a string between 2 and 100 characters');
        }
    }
    
    if (inputObj.description !== undefined) {
        if (typeof inputObj.description !== 'string' || inputObj.description.trim().length < 10 || inputObj.description.trim().length > 1000) {
            errors.push('Description must be a string between 10 and 1000 characters');
        }
    }
    
    if (inputObj.email !== undefined) {
        if (typeof inputObj.email !== 'string') {
            errors.push('Email must be a string');
        } else {
            const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
            if (!emailRegex.test(inputObj.email.trim())) {
                errors.push('Please enter a valid email address');
            }
        }
    }
    
    if (inputObj.logoUrl !== undefined) {
        if (typeof inputObj.logoUrl !== 'string') {
            errors.push('Logo URL must be a string');
        } else if (inputObj.logoUrl.trim()) {
            const logoRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i;
            if (!logoRegex.test(inputObj.logoUrl.trim())) {
                errors.push('Logo URL must be a valid image URL (jpg, jpeg, png, gif, webp, svg)');
            }
        }
    }
    
    if (inputObj.category !== undefined) {
        if (typeof inputObj.category !== 'string' || !validCategories.includes(inputObj.category)) {
            errors.push(`Category must be one of: ${validCategories.join(', ')}`);
        }
    }
    
    if (inputObj.foundedYear !== undefined) {
        if (!Number.isInteger(inputObj.foundedYear) || 
            (inputObj.foundedYear as number) < 1800 || 
            (inputObj.foundedYear as number) > new Date().getFullYear()) {
            errors.push('Founded year must be an integer between 1800 and current year');
        }
    }
    
    if (inputObj.memberCount !== undefined) {
        if (!Number.isInteger(inputObj.memberCount) || (inputObj.memberCount as number) < 0) {
            errors.push('Member count must be a non-negative integer');
        }
    }
    
    if (inputObj.contactPhone !== undefined) {
        if (typeof inputObj.contactPhone !== 'string') {
            errors.push('Contact phone must be a string');
        } else if (inputObj.contactPhone.trim()) {
            const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
            const cleanPhone = inputObj.contactPhone.replace(/[\s\-()]/g, '');
            if (!phoneRegex.test(cleanPhone)) {
                errors.push('Please enter a valid phone number');
            }
        }
    }
    
    // Social links validation
    if (inputObj.socialLinks !== undefined) {
        if (typeof inputObj.socialLinks !== 'object' || inputObj.socialLinks === null) {
            errors.push('Social links must be an object');
        } else {
            const socialLinks = inputObj.socialLinks as Record<string, unknown>;
            
            Object.entries(socialLinks).forEach(([platform, url]) => {
                if (url && typeof url === 'string') {
                    const pattern = socialMediaPatterns[platform as keyof typeof socialMediaPatterns];
                    if (platform === 'website') {
                        if (!urlRegex.test(url)) {
                            errors.push('Website URL must be a valid URL');
                        }
                    } else if (pattern && !pattern.test(url)) {
                        errors.push(`${platform} URL must be a valid ${platform} URL`);
                    }
                }
            });
        }
    }
    
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    
    const data: UpdateClubProfileInput = {};
    if (inputObj.name !== undefined && typeof inputObj.name === 'string') {
        data.name = inputObj.name.trim();
    }
    if (inputObj.description !== undefined && typeof inputObj.description === 'string') {
        data.description = inputObj.description.trim();
    }
    if (inputObj.email !== undefined && typeof inputObj.email === 'string') {
        data.email = inputObj.email.trim().toLowerCase();
    }
    if (inputObj.logoUrl !== undefined && typeof inputObj.logoUrl === 'string') {
        data.logoUrl = inputObj.logoUrl.trim();
    }
    if (inputObj.socialLinks !== undefined) {
        data.socialLinks = inputObj.socialLinks as UpdateClubProfileInput['socialLinks'];
    }
    if (inputObj.category !== undefined && typeof inputObj.category === 'string') {
        data.category = inputObj.category;
    }
    if (inputObj.foundedYear !== undefined && typeof inputObj.foundedYear === 'number') {
        data.foundedYear = inputObj.foundedYear;
    }
    if (inputObj.memberCount !== undefined && typeof inputObj.memberCount === 'number') {
        data.memberCount = inputObj.memberCount;
    }
    if (inputObj.contactPhone !== undefined && typeof inputObj.contactPhone === 'string') {
        data.contactPhone = inputObj.contactPhone.trim();
    }
    
    return {
        isValid: true,
        errors: [],
        data
    };
};