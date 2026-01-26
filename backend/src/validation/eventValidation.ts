export interface CreateEventInput {
    title: string;
    description: string;
    posterUrl?: string;
    location: string;
    category: 'Tech' | 'Cultural' | 'Sports' | 'Workshop' | 'Seminar' | 'Other';
    startTime: Date;
    endTime: Date;
    maxAttendees?: number;
    tags?: string[];
    isPublic?: boolean;
}

export interface UpdateEventInput {
    title?: string;
    description?: string;
    posterUrl?: string;
    location?: string;
    category?: 'Tech' | 'Cultural' | 'Sports' | 'Workshop' | 'Seminar' | 'Other';
    startTime?: Date;
    endTime?: Date;
    maxAttendees?: number;
    tags?: string[];
    isPublic?: boolean;
}

const validCategories = ['Tech', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'];

export const validateCreateEventInput = (input: unknown): { isValid: boolean; errors: string[]; data?: CreateEventInput } => {
    const errors: string[] = [];
    
    if (!input || typeof input !== 'object') {
        errors.push('Input must be an object');
        return { isValid: false, errors };
    }
    
    const inputObj = input as Record<string, unknown>;
    
    if (!inputObj.title || typeof inputObj.title !== 'string') {
        errors.push('Title is required and must be a string');
    } else if (inputObj.title.trim().length < 1 || inputObj.title.trim().length > 200) {
        errors.push('Title must be between 1 and 200 characters');
    }
    
    if (!inputObj.description || typeof inputObj.description !== 'string') {
        errors.push('Description is required and must be a string');
    } else if (inputObj.description.trim().length < 10 || inputObj.description.trim().length > 2000) {
        errors.push('Description must be between 10 and 2000 characters');
    }
    
    if (!inputObj.location || typeof inputObj.location !== 'string') {
        errors.push('Location is required and must be a string');
    } else if (inputObj.location.trim().length < 1 || inputObj.location.trim().length > 200) {
        errors.push('Location must be between 1 and 200 characters');
    }
    
    if (!inputObj.category || typeof inputObj.category !== 'string') {
        errors.push('Category is required and must be a string');
    } else if (!validCategories.includes(inputObj.category)) {
        errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }
    
    if (!inputObj.startTime) {
        errors.push('Start time is required');
    } else {
        const startTime = new Date(inputObj.startTime as string);
        if (isNaN(startTime.getTime())) {
            errors.push('Start time must be a valid date');
        } else if (startTime <= new Date()) {
            errors.push('Start time must be in the future');
        }
    }
    
    if (!inputObj.endTime) {
        errors.push('End time is required');
    } else {
        const endTime = new Date(inputObj.endTime as string);
        if (isNaN(endTime.getTime())) {
            errors.push('End time must be a valid date');
        } else if (inputObj.startTime) {
            const startTime = new Date(inputObj.startTime as string);
            if (!isNaN(startTime.getTime()) && endTime <= startTime) {
                errors.push('End time must be after start time');
            }
        }
    }
    
    if (inputObj.posterUrl && typeof inputObj.posterUrl === 'string') {
        const posterRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
        if (!posterRegex.test(inputObj.posterUrl.trim())) {
            errors.push('Poster URL must be a valid image URL');
        }
    }
    
    if (inputObj.maxAttendees !== undefined) {
        if (!Number.isInteger(inputObj.maxAttendees) || 
            (inputObj.maxAttendees as number) < 1 || 
            (inputObj.maxAttendees as number) > 10000) {
            errors.push('Maximum attendees must be an integer between 1 and 10000');
        }
    }
    
    if (inputObj.tags && Array.isArray(inputObj.tags)) {
        if (inputObj.tags.length > 10) {
            errors.push('Cannot have more than 10 tags');
        }
        for (const tag of inputObj.tags) {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
                errors.push('All tags must be non-empty strings');
                break;
            }
        }
    }
    
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    
    const data: CreateEventInput = {
        title: (inputObj.title as string).trim(),
        description: (inputObj.description as string).trim(),
        location: (inputObj.location as string).trim(),
        category: inputObj.category as CreateEventInput['category'],
        startTime: new Date(inputObj.startTime as string),
        endTime: new Date(inputObj.endTime as string)
    };
    
    if (inputObj.posterUrl && typeof inputObj.posterUrl === 'string') {
        data.posterUrl = inputObj.posterUrl.trim();
    }
    if (inputObj.maxAttendees && typeof inputObj.maxAttendees === 'number') {
        data.maxAttendees = inputObj.maxAttendees;
    }
    if (inputObj.tags && Array.isArray(inputObj.tags)) {
        data.tags = inputObj.tags.map(tag => (tag as string).trim().toLowerCase()).filter(tag => tag.length > 0);
    }
    if (inputObj.isPublic !== undefined) {
        data.isPublic = Boolean(inputObj.isPublic);
    }
    
    return { isValid: true, errors: [], data };
};

export const validateUpdateEventInput = (input: unknown): { isValid: boolean; errors: string[]; data?: UpdateEventInput } => {
    const errors: string[] = [];
    
    if (!input || typeof input !== 'object') {
        errors.push('Input must be an object');
        return { isValid: false, errors };
    }
    
    const inputObj = input as Record<string, unknown>;
    
    if (inputObj.title !== undefined) {
        if (typeof inputObj.title !== 'string' || inputObj.title.trim().length < 1 || inputObj.title.trim().length > 200) {
            errors.push('Title must be a string between 1 and 200 characters');
        }
    }
    
    if (inputObj.description !== undefined) {
        if (typeof inputObj.description !== 'string' || inputObj.description.trim().length < 10 || inputObj.description.trim().length > 2000) {
            errors.push('Description must be a string between 10 and 2000 characters');
        }
    }
    
    if (inputObj.location !== undefined) {
        if (typeof inputObj.location !== 'string' || inputObj.location.trim().length < 1 || inputObj.location.trim().length > 200) {
            errors.push('Location must be a string between 1 and 200 characters');
        }
    }
    
    if (inputObj.category !== undefined) {
        if (typeof inputObj.category !== 'string' || !validCategories.includes(inputObj.category)) {
            errors.push(`Category must be one of: ${validCategories.join(', ')}`);
        }
    }
    
    if (inputObj.startTime !== undefined) {
        const startTime = new Date(inputObj.startTime as string);
        if (isNaN(startTime.getTime())) {
            errors.push('Start time must be a valid date');
        } else if (startTime <= new Date()) {
            errors.push('Start time must be in the future');
        }
    }
    
    if (inputObj.endTime !== undefined) {
        const endTime = new Date(inputObj.endTime as string);
        if (isNaN(endTime.getTime())) {
            errors.push('End time must be a valid date');
        }
    }
    
    if (inputObj.startTime !== undefined && inputObj.endTime !== undefined) {
        const startTime = new Date(inputObj.startTime as string);
        const endTime = new Date(inputObj.endTime as string);
        if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime()) && endTime <= startTime) {
            errors.push('End time must be after start time');
        }
    }
    
    if (inputObj.posterUrl !== undefined && typeof inputObj.posterUrl === 'string' && inputObj.posterUrl.trim()) {
        const posterRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
        if (!posterRegex.test(inputObj.posterUrl.trim())) {
            errors.push('Poster URL must be a valid image URL');
        }
    }
    
    if (inputObj.maxAttendees !== undefined) {
        if (!Number.isInteger(inputObj.maxAttendees) || 
            (inputObj.maxAttendees as number) < 1 || 
            (inputObj.maxAttendees as number) > 10000) {
            errors.push('Maximum attendees must be an integer between 1 and 10000');
        }
    }
    
    if (inputObj.tags !== undefined && Array.isArray(inputObj.tags)) {
        if (inputObj.tags.length > 10) {
            errors.push('Cannot have more than 10 tags');
        }
        for (const tag of inputObj.tags) {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
                errors.push('All tags must be non-empty strings');
                break;
            }
        }
    }
    
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    
    const data: UpdateEventInput = {};
    
    if (inputObj.title !== undefined && typeof inputObj.title === 'string') {
        data.title = inputObj.title.trim();
    }
    if (inputObj.description !== undefined && typeof inputObj.description === 'string') {
        data.description = inputObj.description.trim();
    }
    if (inputObj.location !== undefined && typeof inputObj.location === 'string') {
        data.location = inputObj.location.trim();
    }
    if (inputObj.category !== undefined && typeof inputObj.category === 'string') {
        data.category = inputObj.category as 'Tech' | 'Cultural' | 'Sports' | 'Workshop' | 'Seminar' | 'Other';
    }
    if (inputObj.startTime !== undefined) {
        data.startTime = new Date(inputObj.startTime as string);
    }
    if (inputObj.endTime !== undefined) {
        data.endTime = new Date(inputObj.endTime as string);
    }
    if (inputObj.posterUrl !== undefined && typeof inputObj.posterUrl === 'string') {
        data.posterUrl = inputObj.posterUrl.trim();
    }
    if (inputObj.maxAttendees !== undefined && typeof inputObj.maxAttendees === 'number') {
        data.maxAttendees = inputObj.maxAttendees;
    }
    if (inputObj.tags !== undefined && Array.isArray(inputObj.tags)) {
        data.tags = inputObj.tags.map(tag => (tag as string).trim().toLowerCase()).filter(tag => tag.length > 0);
    }
    if (inputObj.isPublic !== undefined) {
        data.isPublic = Boolean(inputObj.isPublic);
    }
    
    return { isValid: true, errors: [], data };
};