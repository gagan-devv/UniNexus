import { validatePassword } from '../models/User';

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
    role?: 'student' | 'admin';
    firstName?: string | undefined;
    lastName?: string | undefined;
    year?: number | undefined;
    major?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
}

export interface UpdateUserProfileInput {
    firstName?: string | undefined;
    lastName?: string | undefined;
    year?: number | undefined;
    major?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
}

export const validateCreateUserInput = (input: unknown): { isValid: boolean; errors: string[]; data?: CreateUserInput } => {
    const errors: string[] = [];
    
    // Type guard: ensure input is an object
    if (!input || typeof input !== 'object') {
        errors.push('Input must be an object');
        return { isValid: false, errors };
    }
    
    const inputObj = input as Record<string, unknown>;
    
    // Required fields validation
    if (!inputObj.username || typeof inputObj.username !== 'string') {
        errors.push('Username is required and must be a string');
    } else if (inputObj.username.trim().length < 3 || inputObj.username.trim().length > 30) {
        errors.push('Username must be between 3 and 30 characters');
    }
    
    if (!inputObj.email || typeof inputObj.email !== 'string') {
        errors.push('Email is required and must be a string');
    } else {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(inputObj.email.trim())) {
            errors.push('Please enter a valid email address');
        }
    }
    
    if (!inputObj.password || typeof inputObj.password !== 'string') {
        errors.push('Password is required and must be a string');
    } else {
        const passwordValidation = validatePassword(inputObj.password);
        if (!passwordValidation.isValid) {
            errors.push(...passwordValidation.errors);
        }
    }
    
    // Optional role validation
    if (inputObj.role && !['student', 'admin'].includes(inputObj.role as string)) {
        errors.push('Role must be either "student" or "admin"');
    }
    
    // Optional profile fields validation
    if (inputObj.firstName && (typeof inputObj.firstName !== 'string' || inputObj.firstName.trim().length > 50)) {
        errors.push('First name must be a string with maximum 50 characters');
    }
    
    if (inputObj.lastName && (typeof inputObj.lastName !== 'string' || inputObj.lastName.trim().length > 50)) {
        errors.push('Last name must be a string with maximum 50 characters');
    }
    
    if (inputObj.year && (!Number.isInteger(inputObj.year) || (inputObj.year as number) < 1 || (inputObj.year as number) > 8)) {
        errors.push('Year must be an integer between 1 and 8');
    }
    
    if (inputObj.major && (typeof inputObj.major !== 'string' || inputObj.major.trim().length > 100)) {
        errors.push('Major must be a string with maximum 100 characters');
    }
    
    if (inputObj.bio && (typeof inputObj.bio !== 'string' || inputObj.bio.trim().length > 500)) {
        errors.push('Bio must be a string with maximum 500 characters');
    }
    
    if (inputObj.avatarUrl && typeof inputObj.avatarUrl === 'string') {
        const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
        if (!urlRegex.test(inputObj.avatarUrl.trim())) {
            errors.push('Avatar URL must be a valid image URL (jpg, jpeg, png, gif, webp)');
        }
    }
    
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    
    return {
        isValid: true,
        errors: [],
        data: {
            username: (inputObj.username as string).trim(),
            email: (inputObj.email as string).trim().toLowerCase(),
            password: inputObj.password as string,
            role: (inputObj.role as 'student' | 'admin') || 'student',
            firstName: inputObj.firstName ? (inputObj.firstName as string).trim() : undefined,
            lastName: inputObj.lastName ? (inputObj.lastName as string).trim() : undefined,
            year: inputObj.year ? (inputObj.year as number) : undefined,
            major: inputObj.major ? (inputObj.major as string).trim() : undefined,
            bio: inputObj.bio ? (inputObj.bio as string).trim() : undefined,
            avatarUrl: inputObj.avatarUrl ? (inputObj.avatarUrl as string).trim() : undefined
        }
    };
};

export const validateUpdateUserProfileInput = (input: unknown): { isValid: boolean; errors: string[]; data?: UpdateUserProfileInput } => {
    const errors: string[] = [];
    
    // Type guard: ensure input is an object
    if (!input || typeof input !== 'object') {
        errors.push('Input must be an object');
        return { isValid: false, errors };
    }
    
    const inputObj = input as Record<string, unknown>;
    
    // All fields are optional for profile updates
    if (inputObj.firstName !== undefined) {
        if (typeof inputObj.firstName !== 'string' || inputObj.firstName.trim().length > 50) {
            errors.push('First name must be a string with maximum 50 characters');
        }
    }
    
    if (inputObj.lastName !== undefined) {
        if (typeof inputObj.lastName !== 'string' || inputObj.lastName.trim().length > 50) {
            errors.push('Last name must be a string with maximum 50 characters');
        }
    }
    
    if (inputObj.year !== undefined) {
        if (!Number.isInteger(inputObj.year) || (inputObj.year as number) < 1 || (inputObj.year as number) > 8) {
            errors.push('Year must be an integer between 1 and 8');
        }
    }
    
    if (inputObj.major !== undefined) {
        if (typeof inputObj.major !== 'string' || inputObj.major.trim().length > 100) {
            errors.push('Major must be a string with maximum 100 characters');
        }
    }
    
    if (inputObj.bio !== undefined) {
        if (typeof inputObj.bio !== 'string' || inputObj.bio.trim().length > 500) {
            errors.push('Bio must be a string with maximum 500 characters');
        }
    }
    
    if (inputObj.avatarUrl !== undefined) {
        if (typeof inputObj.avatarUrl !== 'string') {
            errors.push('Avatar URL must be a string');
        } else {
            const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
            if (inputObj.avatarUrl.trim() && !urlRegex.test(inputObj.avatarUrl.trim())) {
                errors.push('Avatar URL must be a valid image URL (jpg, jpeg, png, gif, webp)');
            }
        }
    }
    
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    
    const data: UpdateUserProfileInput = {};
    if (inputObj.firstName !== undefined && typeof inputObj.firstName === 'string') {
        data.firstName = inputObj.firstName.trim();
    }
    if (inputObj.lastName !== undefined && typeof inputObj.lastName === 'string') {
        data.lastName = inputObj.lastName.trim();
    }
    if (inputObj.year !== undefined && typeof inputObj.year === 'number') {
        data.year = inputObj.year;
    }
    if (inputObj.major !== undefined && typeof inputObj.major === 'string') {
        data.major = inputObj.major.trim();
    }
    if (inputObj.bio !== undefined && typeof inputObj.bio === 'string') {
        data.bio = inputObj.bio.trim();
    }
    if (inputObj.avatarUrl !== undefined && typeof inputObj.avatarUrl === 'string') {
        data.avatarUrl = inputObj.avatarUrl.trim();
    }
    
    return {
        isValid: true,
        errors: [],
        data
    };
};