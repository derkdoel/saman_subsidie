const ErrorTypes = {
  RECOVERABLE: 'recoverable',
  CRITICAL: 'critical',
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found'
};

/**
 * @class ErrorRecovery
 * @description Handles graceful error handling and recovery for the form filler.
 */
class ErrorRecovery {
  constructor(config = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 500, // Initial delay in ms
      ...config
    };
  }

  /**
   * @description Categorizes an error to determine the appropriate handling strategy.
   * @param {Error} error - The error object.
   * @param {string} context - The context in which the error occurred (e.g., 'field_detection', 'population').
   * @returns {string} The type of the error from ErrorTypes.
   */
  categorize(error, context) {
    if (error.name === 'FieldNotFoundError') {
      return ErrorTypes.NOT_FOUND;
    }
    if (error.name === 'ValidationError') {
      return ErrorTypes.VALIDATION;
    }
    // Add more sophisticated categorization logic here based on error messages or types
    if (context === 'population' || context === 'field_detection') {
      return ErrorTypes.RECOVERABLE;
    }
    return ErrorTypes.CRITICAL;
  }

  /**
   * @description Central error handling function.
   * @param {Error} error - The error to handle.
   * @param {string} context - The context of the error.
   * @returns {Promise<object|null>} A fallback action or null.
   */
  async handleError(error, context) {
    const errorType = this.categorize(error, context);
    this.logError(error, context, errorType);

    switch (errorType) {
      case ErrorTypes.NOT_FOUND:
        return this.getFallback(error, context);
      case ErrorTypes.VALIDATION:
        return this.getFallback(error, context);
      case ErrorTypes.RECOVERABLE:
        // This is a simplified recovery. A more robust implementation would be here.
        break;
      case ErrorTypes.CRITICAL:
        throw error; // Re-throw critical errors to stop the process
    }
    return null;
  }

  /**
   * @description Logs an error with consistent formatting.
   * @param {Error} error - The error object.
   * @param {string} context - The context where the error occurred.
   * @param {string} errorType - The categorized type of the error.
   */
  logError(error, context, errorType) {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      type: errorType,
      context,
      message: error.message,
      stack: error.stack,
    };

    switch (errorType) {
      case ErrorTypes.CRITICAL:
        console.error("Critical Error:", logMessage);
        break;
      case ErrorTypes.VALIDATION:
      case ErrorTypes.NOT_FOUND:
      case ErrorTypes.RECOVERABLE:
        console.warn("Warning:", logMessage);
        break;
      default:
        console.log("Log:", logMessage);
    }
  }

  /**
   * @description Provides a fallback strategy for an error.
   * @param {Error} error - The error object.
   * @param {string} context - The context of the error.
   * @returns {object|null} An object with a fallback action e.g., { action: 'skip' }
   */
  getFallback(error, context) {
    const errorType = this.categorize(error, context);

    if (errorType === ErrorTypes.NOT_FOUND) {
      return { action: 'skip', reason: 'Field not found' };
    }

    if (errorType === ErrorTypes.VALIDATION) {
      // In a real scenario, we might suggest an alternative value.
      // For now, we just recommend skipping.
      return { action: 'skip', reason: 'Validation failed' };
    }

    return null;
  }

  /**
   * @description A generic retry wrapper for operations that might fail.
   * @param {Function} operation - The async function to execute.
   * @returns {Promise<any>} The result of the operation if successful.
   */
  async withRetry(operation) {
    let lastError = null;
    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorType = this.categorize(error, 'retry_operation');
        
        if (errorType === ErrorTypes.CRITICAL) {
          throw error; // Don't retry critical errors
        }

        const delay = this.config.retryDelay * (i + 1);
        this.logError(error, 'retry_operation', `Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay)); // Exponential backoff
      }
    }
    this.logError(lastError, 'retry_operation', 'Max retries reached');
    throw lastError;
  }
}

// Custom error types for better categorization
class FieldNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FieldNotFoundError';
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
} 