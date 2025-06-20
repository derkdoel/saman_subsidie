/**
 * @class FormFillerCoordinator
 * @description Coordinates the form filling process, managing different strategies
 * and orchestrating the various components of the extension.
 */
class FormFillerCoordinator {
  constructor(jsonData, configOptions = {}) {
    this.jsonData = jsonData;
    this.config = new Configuration(configOptions).get();
    
    this.fieldMapping = {};
    this.retryCounts = {}; // Tracks retries on a per-key basis

    this.fieldDetector = new FieldDetector(this.config);
    this.dynamicContentHandler = new DynamicContentHandler(this.config);
    this.validationHandler = new ValidationHandler(this.config);
    this.errorRecovery = new ErrorRecovery(this.config);
  }

  /**
   * Main entry point to start the entire form filling process.
   * This method handles progressive disclosure by waiting for dynamic content.
   */
  async start() {
    console.log('Form Filler Coordinator starting...');
    this.dynamicContentHandler.start();

    for (const key of Object.keys(this.jsonData)) {
      try {
        await this.errorRecovery.withRetry(async () => {
          await this.processField(key);
        });
      } catch (error) {
        console.error(`Could not process key "${key}" after multiple retries.`, error);
        // The error has already been logged by the recovery system.
        // We can decide here if we want to stop the whole process or continue.
        // For now, we'll continue with the next key.
      }
    }

    console.log('Form Filler Coordinator finished.');
    this.dynamicContentHandler.stop();
  }

  /**
   * Processes a single field, including detection, population, and validation.
   * @param {string} key - The key for the field to process.
   */
  async processField(key) {
    this.retryCounts[key] = this.retryCounts[key] || 0;

    let element = this.fieldDetector.findField(key);

    if (!element) {
      await this.dynamicContentHandler.waitForFormUpdates();
      element = this.fieldDetector.findField(key);
    }
    
    if (!element) {
      throw new FieldNotFoundError(`Could not find field for key "${key}" after waiting.`);
    }

    this.fieldMapping[key] = element;
    
    const populator = new DataPopulator({ [key]: element }, { [key]: this.jsonData[key] });
    await populator.populateAll();

    const form = element.form;
    if (form && !this.config.validation.skipInvalidFields) {
      const errors = this.validationHandler.checkForm(form);
      const fieldError = errors.find(e => e.field === (element.name || element.id));
      
      if (fieldError) {
        throw new ValidationError(`Validation failed for "${key}": ${fieldError.message}`);
      }
    }
  }
} 