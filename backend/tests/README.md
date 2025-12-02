# TrustBox Backend Tests

This directory contains comprehensive test suites for the TrustBox backend API.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual functions
│   ├── validation.test.js   # Tests for input validation functions
│   └── encryption.test.js   # Tests for encryption/decryption functions
└── integration/             # Integration tests for API endpoints
    └── api.test.js          # Tests for all /api routes
```

## Running Tests

### Install Dependencies
First, ensure all dependencies are installed:
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage Report
```bash
npm test -- --coverage
```

### Run Tests in Watch Mode (for development)
```bash
npm run test:watch
```

### Run Only Unit Tests
```bash
npm run test:unit
```

### Run Only Integration Tests
```bash
npm run test:integration
```

## Test Coverage

The test suite covers:

### Unit Tests
1. **Validation Functions**
   - `validateInteger()` - Integer validation and parsing
   - `validateStringLength()` - String length validation
   - Username validation (alphanumeric, length constraints)
   - Email validation (format, length constraints)
   - Password validation (length constraints)

2. **Encryption/Decryption Functions**
   - AES-256-CBC encryption
   - Decryption with random IV
   - Handling of special characters and Unicode
   - Error handling for corrupt/invalid data
   - Round-trip data integrity

### Integration Tests
1. **API Prefix Routes** (Main PR Fix)
   - Verifies all endpoints are accessible under `/api` prefix
   - Confirms routes WITHOUT `/api` prefix return 404
   - Tests all 6 main endpoints:
     - `GET /api/getData`
     - `POST /api/saveData`
     - `PUT /api/data/:groupId`
     - `DELETE /api/data/:groupId`
     - `POST /api/register`
     - `POST /api/login`

2. **Input Validation**
   - Missing required fields
   - Invalid data formats
   - Length constraint violations
   - Character restriction violations

3. **Error Handling**
   - Database connection failures
   - Query errors
   - Invalid credentials
   - Service unavailability

## Environment Setup

The integration tests use mocked database connections. To run tests against a real database:

1. Create a `.env.test` file with test database credentials:
```env
ENCRYPTION_KEY=your_32_byte_hex_key_here
DB_USER=test_user
DB_PASSWORD=test_password
DB_SERVER=localhost
DB_DATABASE_SUBMISSION=test_submission
DB_DATABASE_REGISTER=test_register
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
ALLOWED_ORIGINS=http://localhost:3000
```

2. Use a separate test database to avoid affecting production data

## CI/CD Integration

These tests can be integrated into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: |
    cd backend
    npm install
    npm test
```

## Notes

- Tests use Jest as the testing framework
- Supertest is used for HTTP assertions in integration tests
- Database connections are mocked by default to allow tests to run without a database
- All tests follow the AAA pattern: Arrange, Act, Assert

## Coverage Goals

- **Unit Tests**: 100% coverage of validation and encryption functions
- **Integration Tests**: All API endpoints tested with success and error cases
- **Edge Cases**: Invalid input, missing data, database errors

## Future Improvements

1. Add tests for bcrypt password hashing/verification
2. Add tests for CORS configuration
3. Add performance/load tests
4. Add tests for rate limiting (when implemented)
5. Add tests for authentication middleware (when implemented)
6. Add E2E tests with real database
