/**
 * @class ValidationHandler
 * @description Detects and handles form validation errors.
 */
class ValidationHandler {
  /**
   * @param {object} config - Configuration options, e.g., { skipValidation: false }.
   */
  constructor(config = {}) {
    this.config = {
      skipValidation: false,
      ...config,
    };
    this.errors = [];
  }

  /**
   * Checks the entire form for validation errors.
   * @param {HTMLElement} formElement - The form to validate.
   * @returns {Array} A list of validation errors found.
   */
  checkForm(formElement) {
    if (this.config.skipValidation) {
      console.log('Validation skipped due to configuration.');
      return [];
    }

    this.clearErrors();
    console.log('Checking form for validation errors...');
    
    const fields = formElement.querySelectorAll('input, select, textarea');
    fields.forEach(field => this.detectFieldErrors(field));

    return this.getValidationErrors();
  }

  /**
   * Detects validation errors for a single field.
   * @param {HTMLElement} element - The form element to check.
   */
  detectFieldErrors(element) {
    const errorMessages = [];
    const fieldName = element.name || element.id || 'Unnamed Field';

    // Strategy 1: Check for aria-invalid attribute
    if (element.getAttribute('aria-invalid') === 'true') {
      // Find the associated error message, often linked by aria-describedby
      const describedById = element.getAttribute('aria-describedby');
      if (describedById) {
        const errorEl = document.getElementById(describedById);
        if (errorEl) {
          errorMessages.push(errorEl.textContent.trim());
        }
      }
    }

    // Strategy 2: Look for sibling/nearby elements with common error class names
    let parent = element.parentElement;
    for (let i = 0; i < 2 && parent; i++) { // Search 2 levels up
      const errorEl = parent.querySelector('.error-message, .validation-error, [class*="error"]');
      if (errorEl && !errorMessages.includes(errorEl.textContent.trim())) {
        errorMessages.push(errorEl.textContent.trim());
      }
      parent = parent.parentElement;
    }

    if (errorMessages.length > 0) {
      this.errors.push({ field: fieldName, messages: errorMessages });
    }
  }

  /**
   * Returns all collected validation errors.
   * @returns {Array} The list of errors.
   */
  getValidationErrors() {
    return this.errors;
  }

  /**
   * Clears all stored validation errors.
   */
  clearErrors() {
    this.errors = [];
  }
} 