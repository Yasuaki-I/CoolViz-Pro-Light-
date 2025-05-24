const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ImageProcessingError,
  BannerGenerationError,
  CacheError,
  ExternalAPIError,
  createError,
  createErrorResponse
} = require('../../utils/errors');

describe('Error Handling System', () => {
  describe('Base Error Class', () => {
    test('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 500, { context: 'test' });
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.context).toEqual({ context: 'test' });
      expect(error.status).toBe('error');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('Specific Error Classes', () => {
    test('should create ValidationError with 400 status code', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
    });

    test('should create AuthenticationError with 401 status code', () => {
      const error = new AuthenticationError('Unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.status).toBe('fail');
    });

    test('should create AuthorizationError with 403 status code', () => {
      const error = new AuthorizationError('Forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.status).toBe('fail');
    });
  });

  describe('Error Factory', () => {
    test('should create specific error types', () => {
      const validationError = createError('ValidationError', 'Invalid input');
      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError.statusCode).toBe(400);

      const authError = createError('AuthenticationError', 'Unauthorized');
      expect(authError).toBeInstanceOf(AuthenticationError);
      expect(authError.statusCode).toBe(401);
    });

    test('should fallback to AppError for unknown types', () => {
      const unknownError = createError('UnknownError', 'Test error');
      expect(unknownError).toBeInstanceOf(AppError);
      expect(unknownError.statusCode).toBe(500);
    });
  });

  describe('Error Response Creation', () => {
    test('should create error response with basic information', () => {
      const error = new ValidationError('Invalid input');
      const response = createErrorResponse(error);
      
      expect(response.error).toHaveProperty('type', 'ValidationError');
      expect(response.error).toHaveProperty('message', 'Invalid input');
      expect(response.error).toHaveProperty('timestamp');
    });

    test('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new ValidationError('Invalid input');
      const response = createErrorResponse(error);
      
      expect(response.error).toHaveProperty('stack');
      expect(response.error).toHaveProperty('context');
    });

    test('should exclude stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new ValidationError('Invalid input');
      const response = createErrorResponse(error);
      
      expect(response.error).not.toHaveProperty('stack');
      expect(response.error).not.toHaveProperty('context');
    });
  });
}); 