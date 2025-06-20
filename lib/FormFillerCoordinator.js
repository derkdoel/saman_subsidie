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
    this.formNavigator = new FormNavigator(this.config);
  }

  /**
   * Main entry point to start the entire form filling process.
   * This method handles progressive disclosure by waiting for dynamic content.
   */
  async start() {
    console.log('Form Filler Coordinator starting...');
    const filledFields = [];
    const errors = [];
    this.dynamicContentHandler.start();

    for (const key of Object.keys(this.jsonData)) {
      try {
        // ======================= THE FINAL FIX ========================
        // Add a deliberate, randomized pause BEFORE each operation to
        // simulate a user's natural "thinking time" between fields.
        const humanThinkingTime = Math.random() * 500 + 250; // Pause for 250-750ms
        console.log(`Pausing for ${Math.round(humanThinkingTime)}ms before filling "${key}"...`);
        await new Promise(resolve => setTimeout(resolve, humanThinkingTime));
        // ==============================================================

        await this.errorRecovery.withRetry(async () => {
          await this.processField(key);
        });

        filledFields.push(key);
        // Continue to wait for stabilization AFTER each field as well.
        console.log(`System stabilizing after populating: "${key}"`);
        await this.dynamicContentHandler.waitForFormUpdates(2000);

      } catch (error) {
        console.error(`Could not process key "${key}" after multiple retries.`, error);
        errors.push({ key: key, message: error.message, stack: error.stack });
      }
    }

    console.log('Final stabilization wait before completing.');
    await this.dynamicContentHandler.waitForFormUpdates(2000);

    console.log('Form Filler Coordinator finished. Attempting to navigate to next step...');
    await this.formNavigator.navigateNext();
    
    this.dynamicContentHandler.stop();

    return {
      success: errors.length === 0,
      filledFields,
      errors,
    };
  }

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