import * as fc from 'fast-check';
import { ObjectId } from 'mongodb';

// User data generators
export const userDataGenerator = () => fc.record({
  username: fc.string({ minLength: 3, maxLength: 20 })
    .filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
  email: fc.emailAddress(),
  password: fc.string({ minLength: 8, maxLength: 50 })
    .filter(hasNumberAndSpecialChar),
  role: fc.constantFrom('student', 'admin')
});

export const validUserDataGenerator = () => fc.record({
  username: fc.string({ minLength: 3, maxLength: 20 })
    .filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
  email: fc.emailAddress(),
  password: fc.string({ minLength: 8, maxLength: 50 })
    .filter(hasNumberAndSpecialChar),
  role: fc.constantFrom('student', 'admin'),
  profile: fc.record({
    firstName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    lastName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    year: fc.option(fc.constantFrom('1', '2', '3', '4', 'Graduate')),
    major: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    bio: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
    avatarUrl: fc.option(fc.webUrl())
  })
});

export const invalidUserDataGenerator = () => fc.oneof(
  // Invalid username (too short, too long, or invalid characters)
  fc.record({
    username: fc.oneof(
      fc.string({ maxLength: 2 }),
      fc.string({ minLength: 21 }),
      fc.string().filter(s => /[^a-zA-Z0-9_]/.test(s))
    ),
    email: fc.emailAddress(),
    password: fc.string({ minLength: 8 }).filter(hasNumberAndSpecialChar),
    role: fc.constantFrom('student', 'admin')
  }),
  // Invalid email
  fc.record({
    username: fc.string({ minLength: 3, maxLength: 20 }),
    email: fc.string().filter(s => !s.includes('@') || !s.includes('.')),
    password: fc.string({ minLength: 8 }).filter(hasNumberAndSpecialChar),
    role: fc.constantFrom('student', 'admin')
  }),
  // Invalid password (too short or missing requirements)
  fc.record({
    username: fc.string({ minLength: 3, maxLength: 20 }),
    email: fc.emailAddress(),
    password: fc.oneof(
      fc.string({ maxLength: 7 }),
      fc.string({ minLength: 8 }).filter(s => !/\d/.test(s)),
      fc.string({ minLength: 8 }).filter(s => !/[!@#$%^&*(),.?":{}|<>]/.test(s))
    ),
    role: fc.constantFrom('student', 'admin')
  })
);

// Club profile generators
export const clubProfileDataGenerator = () => fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 1000 }),
  email: fc.emailAddress(),
  logoUrl: fc.option(fc.webUrl()),
  socialLinks: fc.record({
    instagram: fc.option(fc.webUrl()),
    linkedin: fc.option(fc.webUrl()),
    website: fc.option(fc.webUrl()),
    medium: fc.option(fc.webUrl()),
    reddit: fc.option(fc.webUrl())
  })
});

// Event data generators
export const eventDataGenerator = () => fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 10, maxLength: 2000 }),
  location: fc.string({ minLength: 1, maxLength: 200 }),
  category: fc.constantFrom('Tech', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'),
  startTime: fc.date({ min: new Date() }),
  endTime: fc.date({ min: new Date(Date.now() + 3600000) }), // At least 1 hour from now
  maxAttendees: fc.option(fc.integer({ min: 1, max: 1000 })),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
  isPublic: fc.boolean(),
  posterUrl: fc.option(fc.webUrl())
}).filter(event => event.startTime < event.endTime);

export const validEventDataGenerator = () => fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 10, maxLength: 2000 }),
  location: fc.string({ minLength: 1, maxLength: 200 }),
  category: fc.constantFrom('Tech', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'),
  startTime: fc.date({ min: new Date(Date.now() + 3600000) }), // At least 1 hour from now
  endTime: fc.date({ min: new Date(Date.now() + 7200000) }), // At least 2 hours from now
  maxAttendees: fc.option(fc.integer({ min: 1, max: 1000 })),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
  isPublic: fc.boolean(),
  posterUrl: fc.option(fc.webUrl())
}).filter(event => event.startTime < event.endTime);

// RSVP data generators
export const rsvpDataGenerator = () => fc.record({
  status: fc.constantFrom('going', 'interested', 'not_going', 'waitlist')
});

// Comment data generators
export const commentDataGenerator = () => fc.record({
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  parentId: fc.option(fc.string()) // Will be replaced with actual ObjectId in tests
});

// Vote data generators
export const voteDataGenerator = () => fc.record({
  type: fc.constantFrom('upvote', 'downvote')
});

// ObjectId generator
export const objectIdGenerator = () => fc.string().map(() => new ObjectId().toString());

// Utility functions
export function hasNumberAndSpecialChar(password: string): boolean {
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return hasNumber && hasSpecialChar;
}

// Pagination generators
export const paginationGenerator = () => fc.record({
  limit: fc.integer({ min: 1, max: 100 }),
  offset: fc.integer({ min: 0, max: 1000 })
});

// Date range generators
export const dateRangeGenerator = () => fc.record({
  startDate: fc.date(),
  endDate: fc.date()
}).filter(range => range.startDate <= range.endDate);

// Search query generators
export const searchQueryGenerator = () => fc.oneof(
  fc.string({ minLength: 1, maxLength: 100 }),
  fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 })
    .map(words => words.join(' '))
);

// Filter generators
export const eventFiltersGenerator = () => fc.record({
  category: fc.option(fc.constantFrom('Tech', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other')),
  dateRange: fc.option(dateRangeGenerator()),
  location: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
  organizerId: fc.option(objectIdGenerator()),
  limit: fc.option(fc.integer({ min: 1, max: 100 })),
  offset: fc.option(fc.integer({ min: 0, max: 1000 }))
});

// API response generators
export const apiErrorGenerator = () => fc.record({
  code: fc.string({ minLength: 1, maxLength: 50 }),
  message: fc.string({ minLength: 1, maxLength: 200 }),
  details: fc.option(fc.anything()),
  timestamp: fc.date().map(d => d.toISOString()),
  requestId: fc.uuid()
});