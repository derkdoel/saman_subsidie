/**
 * @class EloketFormFiller
 * @description The main class that orchestrates the entire form filling process.
 */
class EloketFormFiller {
  /**
   * @param {object} configOptions - User-provided configuration options.
   */
  constructor(configOptions = {}) {
    this.config = new Configuration(configOptions);
    this.stats = {
      fieldsFound: 0,
      fieldsPopulated: 0,
      errors: 0,
      startTime: null,
      endTime: null,
    };
  }

  /**
   * @description The main public method to start the form filling process.
   * @param {object} jsonData - The data to be filled into the form.
   * @param {object} [options] - Optional configuration overrides for this specific run.
   * @returns {Promise<object>} A promise that resolves with the final status and statistics.
   */
  async fillForm(jsonData, options = {}) {
    this.stats.startTime = new Date();
    const runConfig = new Configuration(options ? this.config.deepMerge(this.config.get(), options) : this.config.get());

    try {
      this.validateInputData(jsonData);

      const coordinator = new FormFillerCoordinator(jsonData, runConfig.get());
      const result = await coordinator.start();

      // Generate response object
      const response = {
        success: result.success,
        filledFields: result.filledFields,
        errors: result.errors,
        message: result.success ? 'Form filled successfully.' : 'Form filling encountered errors.',
      };
      
      console.log('Form filling process completed.', response);
      return response;
    } catch (error) {
      this.stats.errors++;
      console.error("Form filling process failed:", error);
      return this.generateResponse('error', error.message);
    } finally {
      this.stats.endTime = new Date();
    }
  }

  /**
   * @description Validates the input JSON data.
   * @param {object} jsonData - The data to validate.
   */
  validateInputData(jsonData) {
    if (!jsonData || typeof jsonData !== 'object' || Object.keys(jsonData).length === 0) {
      throw new Error("Invalid or empty JSON data provided.");
    }
    for (const key in jsonData) {
      if (typeof key !== 'string' || key.trim() === '') {
        throw new Error("Invalid key in JSON data: keys must be non-empty strings.");
      }
      const value = jsonData[key];
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        throw new Error(`Invalid value for key "${key}". Values must be string, number, or boolean.`);
      }
    }
  }

  /**
   * @description Generates the final response object.
   * @param {string} status - The final status of the operation ('success', 'error').
   * @param {string} [errorMessage] - An error message if applicable.
   * @returns {object} The response object.
   */
  generateResponse(status, errorMessage) {
    this.stats.endTime = this.stats.endTime || new Date();
    const duration = this.stats.endTime - this.stats.startTime;

    const response = {
      status,
      stats: {
        ...this.stats,
        duration: `${duration}ms`,
      },
      errors: [],
    };

    if (errorMessage) {
      response.errors.push({
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }

    return response;
  }
} 