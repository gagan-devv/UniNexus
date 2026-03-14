# UniNexus Backend

TypeScript-powered Express.js backend for the UniNexus campus event discovery and community platform. Features comprehensive testing with property-based validation, JWT authentication, MongoDB with materialized path for threaded comments, AWS S3 integration, and Redis caching.

## Features

### Core Functionality
- **Authentication & Authorization**: JWT-based auth with bcrypt password hashing, role-based access control (Student, Club Admin, Super Admin)
- **Event Management**: Full CRUD operations with filtering, search, RSVP tracking, and capacity management
- **Club Management**: Club profiles with approval workflow, member management, and admin moderation
- **Threaded Comments**: Infinite-depth nested discussions using materialized path pattern for O(1) tree fetching
- **Voting System**: Atomic upvote/downvote operations with race condition prevention
- **Notifications**: Real-time notification system for events, RSVPs, comments, and admin actions
- **Direct Messaging**: One-on-one conversations between users
- **Admin Dashboard**: Super-admin panel for club approvals, rejections, and audit logging
- **Media Management**: AWS S3 integration with presigned URLs and Sharp image processing

### Technical Highlights
- **TypeScript**: Strict type checking with enhanced compiler options
- **Property-Based Testing**: Universal correctness validation with fast-check (100+ iterations per property)
- **MongoDB Memory Server**: Isolated in-memory database for testing
- **Atomic Operations**: Race-condition-free voting and concurrent updates
- **Materialized Path**: Efficient hierarchical data storage for comments
- **Redis Caching**: Optional caching layer for performance optimization
- **Zod Validation**: Runtime type validation for all API inputs
- **Audit Logging**: Complete audit trail for admin and moderation actions

## Project Structure

```
backend/
├── src/                    # Source code
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middlewares/       # Express middlewares
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── server.ts         # Application entry point
├── tests/                 # Test files
│   ├── generators/       # Property-based test generators
│   ├── setup.ts          # Test setup configuration
│   ├── globalSetup.ts    # Global test setup
│   └── globalTeardown.ts # Global test cleanup
├── dist/                 # Compiled JavaScript (generated)
├── coverage/             # Test coverage reports (generated)
└── node_modules/         # Dependencies (generated)
```

## Enhanced TypeScript Configuration

- **Strict Type Checking**: Enabled all strict TypeScript compiler options
- **Path Mapping**: Configured `@/` alias for clean imports
- **Enhanced Error Detection**: Additional compiler flags for better error catching
- **Source Maps**: Enabled for debugging support

## Testing Framework

### Dual Testing Approach

1. **Unit Tests**: Specific examples and edge cases
2. **Property-Based Tests**: Universal properties with 100+ iterations using fast-check

### Testing Stack

- **Jest**: Test runner with TypeScript support
- **MongoDB Memory Server**: Isolated in-memory database for testing
- **fast-check**: Property-based testing library
- **Supertest**: HTTP assertion library for API testing

### Test Configuration

- **Isolated Environment**: Each test runs with a clean database
- **Custom Generators**: Domain-specific data generators for comprehensive testing
- **Global Setup/Teardown**: Proper test environment initialization and cleanup
- **Coverage Reporting**: Comprehensive code coverage analysis

## Available Scripts

```bash
# Development
npm run dev             # Start development server with nodemon (auto-reload)
npm start               # Start production server
npm run build           # Compile TypeScript to JavaScript

# Testing
npm test                # Run all tests with Jest
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
npm run test:pbt        # Run only property-based tests
npm run test:unit       # Run only unit tests
npm run test:integration # Run only integration tests

# Database & Scripts
npm run test:db         # Test database connection
npm run debug:db        # Debug database connection issues
npm run atlas:status    # Check MongoDB Atlas status
npm run get-ip          # Get your public IP (for Atlas whitelist)
npm run seed            # Seed database with sample data
npm run script:setSuperAdmin  # Promote user to super admin

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Run ESLint with auto-fix
```

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/uninexus
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/uninexus

# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12

# AWS S3 Configuration (for media uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=uninexus-media

# Redis (Optional - for caching)
REDIS_URL=redis://localhost:6379

# Email (Optional - for notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### Development Environment

Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

### Testing Environment

Test environment uses `.env.test` with MongoDB Memory Server automatically overriding the database connection. No manual configuration needed for testing.

## Property-Based Testing

Property-based tests validate universal correctness properties with 100+ iterations using fast-check:

### Implemented Properties

1. **Comment Hierarchy Integrity**: For any comment with a parent, the comment's path must start with the parent's path + parent's ID
2. **Vote Uniqueness**: For any comment, a user ID cannot appear in both upvotes and downvotes arrays simultaneously
3. **Vote Count Accuracy**: For any comment, voteCount must equal (upvotes.length - downvotes.length)
4. **Soft Delete Preservation**: For any deleted comment with replies, the comment node must remain with isDeleted = true
5. **Authorization Enforcement**: For any comment edit/delete, the system must verify the user is either the author or a moderator
6. **Admin Role Verification**: For any admin endpoint, the system must verify the user has isSuperAdmin = true
7. **Club Status Transition**: For any club approval/rejection, status must transition from "pending" to "approved" or "rejected" (never backwards)
8. **Audit Log Completeness**: For any admin action, an audit log entry must be created
9. **Comment Validation**: For any comment creation, content must be non-empty and ≤2000 characters
10. **Path Depth Consistency**: For any comment, the depth field must equal the number of IDs in the path string

### Example Property Test

```typescript
test('Property: Vote uniqueness - user cannot upvote and downvote simultaneously', () => {
  fc.assert(fc.property(
    commentDataGenerator(),
    userDataGenerator(),
    async (commentData, userData) => {
      const comment = await Comment.create(commentData);
      const user = await User.create(userData);
      
      // Upvote
      await upvoteComment(comment._id, user._id);
      let updated = await Comment.findById(comment._id);
      
      expect(updated.upvotes).toContain(user._id);
      expect(updated.downvotes).not.toContain(user._id);
      
      // Switch to downvote
      await downvoteComment(comment._id, user._id);
      updated = await Comment.findById(comment._id);
      
      expect(updated.downvotes).toContain(user._id);
      expect(updated.upvotes).not.toContain(user._id);
    }
  ), { numRuns: 100 });
});
```

## Custom Generators

Located in `tests/generators/index.ts`, these generators produce valid and invalid test data:

### Available Generators

- **`userDataGenerator()`**: User registration and profile data
  - Valid: username (3-30 chars), email, password (8+ chars)
  - Invalid: empty fields, short passwords, invalid emails

- **`eventDataGenerator()`**: Event creation data
  - Valid: title, description, date, venue, capacity
  - Invalid: past dates, negative capacity, empty required fields

- **`clubProfileDataGenerator()`**: Club profile data
  - Valid: name, description, logo URL, social links
  - Invalid: empty name, invalid URLs

- **`commentDataGenerator()`**: Comment and discussion data
  - Valid: content (1-2000 chars), eventId, parentId (optional)
  - Invalid: empty content, content >2000 chars, invalid IDs

- **`voteDataGenerator()`**: Voting action data
  - Valid: voteType ('upvote', 'downvote', 'remove')
  - Invalid: invalid vote types

### Usage Example

```typescript
import { userDataGenerator, commentDataGenerator } from './generators';

test('Property: Comment author must be valid user', () => {
  fc.assert(fc.property(
    userDataGenerator(),
    commentDataGenerator(),
    async (userData, commentData) => {
      const user = await User.create(userData);
      const comment = await Comment.create({
        ...commentData,
        author: user._id
      });
      
      expect(comment.author.toString()).toBe(user._id.toString());
    }
  ), { numRuns: 100 });
});
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login and receive JWT token
- `GET /me` - Get current user profile (requires auth)
- `PUT /profile` - Update user profile (requires auth)
- `POST /logout` - Logout user (requires auth)

### Users (`/api/users`)
- `GET /:id` - Get user profile by ID
- `PUT /:id` - Update user profile (requires auth, own profile only)
- `GET /:id/events` - Get user's created events
- `GET /:id/rsvps` - Get user's RSVP'd events

### Events (`/api/events`)
- `GET /` - Get all events (with filters: date, category, club, search)
- `GET /:id` - Get event details
- `POST /` - Create event (requires auth, club admin only)
- `PUT /:id` - Update event (requires auth, club admin only)
- `DELETE /:id` - Delete event (requires auth, club admin only)
- `POST /:id/rsvp` - RSVP to event (requires auth)
- `DELETE /:id/rsvp` - Cancel RSVP (requires auth)

### Clubs (`/api/clubs`)
- `GET /` - Get all approved clubs
- `GET /:id` - Get club details
- `POST /` - Create club (requires auth, creates pending club)
- `PUT /:id` - Update club (requires auth, club admin only)
- `DELETE /:id` - Delete club (requires auth, club admin only)
- `GET /:id/members` - Get club members
- `POST /:id/members` - Add club member (requires auth, club admin only)
- `DELETE /:id/members/:userId` - Remove club member (requires auth, club admin only)

### Comments (`/api/comments`)
- `GET /event/:eventId` - Get all comments for event (with sorting: hot, top, new, controversial)
- `POST /` - Create comment (requires auth)
- `PUT /:id` - Update comment (requires auth, author only)
- `DELETE /:id` - Delete comment (requires auth, author or moderator)
- `POST /:id/vote` - Vote on comment (requires auth)

### Admin (`/api/admin`)
- `GET /clubs/pending` - Get pending club registrations (requires super admin)
- `POST /clubs/:id/approve` - Approve club (requires super admin)
- `POST /clubs/:id/reject` - Reject club with reason (requires super admin)
- `GET /audit-logs` - Get audit logs (requires super admin)

### Notifications (`/api/notifications`)
- `GET /` - Get user notifications (requires auth)
- `PUT /:id/read` - Mark notification as read (requires auth)
- `PUT /read-all` - Mark all notifications as read (requires auth)
- `DELETE /:id` - Delete notification (requires auth)

### Messages (`/api/messages`)
- `GET /conversations` - Get user conversations (requires auth)
- `GET /:conversationId` - Get messages in conversation (requires auth)
- `POST /` - Send message (requires auth)
- `DELETE /:id` - Delete message (requires auth, sender only)

### Discover & Trending (`/api/discover`, `/api/trending`)
- `GET /discover` - Get personalized event recommendations (requires auth)
- `GET /trending` - Get trending events

### Media (`/api/media`)
- `POST /upload` - Upload image to S3 (requires auth)
- `DELETE /:key` - Delete image from S3 (requires auth)

### Settings (`/api/settings`)
- `GET /` - Get user settings (requires auth)
- `PUT /` - Update user settings (requires auth)
- `PUT /password` - Change password (requires auth)
- `PUT /notifications` - Update notification preferences (requires auth)

### RSVP (`/api/rsvp`)
- `GET /event/:eventId` - Get RSVPs for event
- `POST /` - Create RSVP (requires auth)
- `DELETE /:id` - Cancel RSVP (requires auth)

### ESLint Configuration
- TypeScript-specific rules
- Consistent code formatting
- Security best practices
- Test file exceptions

### TypeScript Strict Mode
- No implicit any
- Strict null checks
- Exact optional property types
- No unchecked indexed access

## Database Testing

- **MongoDB Memory Server**: Isolated test database
- **Automatic Cleanup**: Collections cleared after each test
- **Real Operations**: Tests use actual MongoDB operations, not mocks

## Getting Started

### Prerequisites
- Node.js v18 or higher
- MongoDB v6 or higher (local or Atlas)
- Redis (optional, for caching)
- AWS Account (for S3 storage)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start MongoDB (if using local):
   ```bash
   mongod
   ```

4. Run tests to verify setup:
   ```bash
   npm test
   ```

5. Seed database with sample data (optional):
   ```bash
   npm run seed
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

### Creating a Super Admin

After starting the server, promote a user to super admin:

```bash
npm run script:setSuperAdmin
# Follow prompts to enter user email
```

Or manually in MongoDB:
```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { isSuperAdmin: true } }
)
```

## Testing Guidelines

- Write both unit and property-based tests for new features
- Use custom generators for consistent test data
- Test error conditions and edge cases
- Maintain high test coverage
- Follow the dual testing approach for comprehensive validation

## Next Steps

This enhanced project structure provides the foundation for:
1. Implementing authentication system with property-based security testing
2. Building event management with comprehensive validation
3. Creating discussion system with materialized path testing
4. Integrating AI features with robust error handling
5. Ensuring API consistency through property-based response testing


---

## Database Models

### User
- Authentication credentials (email, password hash)
- Profile information (username, bio, avatar)
- Role (isSuperAdmin flag)
- Timestamps

### ClubProfile
- Club information (name, description, logo)
- Social links (website, Instagram, etc.)
- Approval status (pending, approved, rejected)
- Approval metadata (approvedBy, rejectedReason)
- Member count, event count
- Timestamps

### ClubMember
- User-Club relationship
- Role (admin, member)
- Join date

### Event
- Event details (title, description, date, venue)
- Capacity and RSVP tracking
- Category and tags
- Images (stored in S3)
- Club association
- Timestamps

### Comment
- Content (1-2000 characters)
- Author, event references
- Materialized path for hierarchy
- Depth level
- Voting arrays (upvotes, downvotes)
- Vote count (computed)
- Moderation flags (isDeleted, deletedBy, moderationReason)
- Edit tracking (isEdited, editedAt)
- Timestamps

### RSVP
- User-Event relationship
- RSVP status
- Timestamps

### Notification
- Recipient user
- Type (event_update, rsvp, comment_reply, club_approved, etc.)
- Content and metadata
- Read status
- Timestamps

### Message
- Sender and recipient
- Conversation reference
- Content
- Read status
- Timestamps

### Conversation
- Participants array
- Last message reference
- Unread counts
- Timestamps

### AuditLog
- Action type (club_approved, club_rejected, comment_moderated)
- Actor (admin/moderator user)
- Target (club, comment, etc.)
- Metadata (reason, details)
- Timestamps

---

## Architecture Patterns

### Materialized Path for Comments
Enables O(1) fetching of entire comment trees without recursive queries:

```typescript
// Comment structure
{
  _id: "comment123",
  path: "parent1.parent2.",  // Materialized path
  depth: 2,                   // Nesting level
  content: "This is a reply"
}

// Fetch entire tree in one query
const comments = await Comment.find({ eventId })
  .sort({ path: 1, createdAt: -1 });
```

### Atomic Voting Operations
Prevents race conditions with MongoDB atomic operators:

```typescript
// Upvote (atomic operation)
await Comment.findByIdAndUpdate(commentId, {
  $addToSet: { upvotes: userId },  // Add to upvotes
  $pull: { downvotes: userId }      // Remove from downvotes
});
```

### Soft Deletes
Preserves thread structure when comments are deleted:

```typescript
// Soft delete
await Comment.findByIdAndUpdate(commentId, {
  isDeleted: true,
  deletedBy: userId,
  deletedAt: new Date()
});

// Display as "[deleted]" but keep in tree
```

### JWT Authentication
Stateless authentication with role-based access control:

```typescript
// Generate token
const token = jwt.sign(
  { userId: user._id, role: user.isSuperAdmin ? 'admin' : 'user' },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Verify and extract
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

---

## Performance Optimization

### Database Indexing
```typescript
// Compound indexes for efficient queries
commentSchema.index({ eventId: 1, path: 1 });
commentSchema.index({ eventId: 1, voteCount: -1 });
commentSchema.index({ eventId: 1, createdAt: -1 });
eventSchema.index({ date: 1, category: 1 });
clubProfileSchema.index({ status: 1 });
```

### Redis Caching
```typescript
// Cache comment counts
await redis.set(`comment_count:${eventId}`, count, 'EX', 300);

// Cache trending events
await redis.set('trending_events', JSON.stringify(events), 'EX', 600);
```

### Query Optimization
- Useand ESLint rules
6. Write clear commit messages
7. Open a pull request with detailed description

---

## License

ISC License
base: Tests use MongoDB Memory Server
- Check for port conflicts
- Verify all dependencies are installed

**Redis Connection Errors:**
- Verify Redis is running: `redis-cli ping`
- Check `REDIS_URL` in `.env`
- Redis is optional; app works without it

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Write tests for new features
4. Ensure all tests pass: `npm test`
5. Follow TypeScript s3:PutObject` permission

**Test Failures:**
- Clear test dataadmin and moderation actions

---

## Troubleshooting

### Common Issues

**MongoDB Connection Errors:**
- Verify MongoDB is running: `mongod --version`
- Check connection string in `.env`
- For Atlas: Verify IP whitelist and credentials

**JWT Token Errors:**
- Ensure `JWT_SECRET` is set in `.env`
- Check token expiration time
- Verify token format in Authorization header

**AWS S3 Upload Errors:**
- Verify AWS credentials in `.env`
- Check S3 bucket exists and has correct permissions
- Ensure IAM user has `re allowed origins
- **Environment Variables**: Never commit `.env` files
- **Audit Logging**: Track all  `.lean()` for read-only queries (faster)
- Use `.select()` to fetch only required fields
- Use aggregation pipelines for complex queries
- Implement cursor-based pagination for large datasets

---

## Security Best Practices

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Secrets**: Strong, randomly generated secrets
- **Input Validation**: Zod schemas for all API inputs
- **XSS Prevention**: Sanitize user-generated content
- **Rate Limiting**: Prevent abuse with request limits
- **CORS**: Configu