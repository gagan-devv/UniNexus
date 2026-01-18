# UniNexus Backend

Enhanced TypeScript backend with comprehensive testing framework for the UniNexus campus event discovery platform.

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
# Testing
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
npm run test:pbt        # Run only property-based tests
npm run test:unit       # Run only unit tests
npm run test:integration # Run only integration tests

# Development
npm run dev             # Start development server with nodemon
npm start               # Start production server
npm run build           # Compile TypeScript to JavaScript

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Run ESLint with auto-fix
```

## Environment Configuration

### Development
Copy `.env.example` to `.env` and configure:
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/uninexus
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12
```

### Testing
Test environment uses `.env.test` with MongoDB Memory Server overriding database connection.

## Property-Based Testing

Property-based tests validate universal correctness properties:

```typescript
// Example property test
test('Property: User data generator should produce valid data structure', () => {
  fc.assert(fc.property(
    userDataGenerator(),
    (userData) => {
      expect(userData).toHaveProperty('username');
      expect(userData.username.length).toBeGreaterThanOrEqual(3);
      expect(userData.email).toMatch(/@/);
    }
  ), { numRuns: 100 });
});
```

## Custom Generators

Located in `tests/generators/index.ts`:
- `userDataGenerator()`: Valid/invalid user data
- `eventDataGenerator()`: Event creation data
- `clubProfileDataGenerator()`: Club profile data
- `commentDataGenerator()`: Comment and discussion data

## Code Quality

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

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Run tests to verify setup:
   ```bash
   npm test
   ```

4. Start development server:
   ```bash
   npm run dev
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