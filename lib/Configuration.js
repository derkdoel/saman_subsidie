/**
 * @class Configuration
 * @description Manages the configuration for the form filler, merging defaults with user options.
 */
class Configuration {
  constructor(userConfig = {}) {
    const defaultConfig = {
      fieldDetection: {
        timeout: 5000,
        retryAttempts: 3,
        fuzzyMatching: true,
      },
      population: {
        delayBetweenFields: 100,
        triggerEvents: true,
        skipReadonly: true,
      },
      validation: {
        waitForValidation: 2000,
        retryOnError: true,
        skipInvalidFields: false,
      },
      autoSubmit: false,
    };

    // Deep merge of the default and user configurations
    this.settings = this.deepMerge(defaultConfig, userConfig);
    this.validate();
  }

  /**
   * @description Deeply merges two objects.
   * @param {object} target - The target object.
   * @param {object} source - The source object.
   * @returns {object} The merged object.
   */
  deepMerge(target, source) {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  /**
   * @description Checks if a variable is an object.
   * @param {*} item - The variable to check.
   * @returns {boolean}
   */
  isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
  
  /**
   * @description Validates the current configuration settings.
   */
  validate() {
    this.settings.fieldDetection.timeout = this.validateNumber(this.settings.fieldDetection.timeout, 5000, 'fieldDetection.timeout');
    this.settings.fieldDetection.retryAttempts = this.validateNumber(this.settings.fieldDetection.retryAttempts, 3, 'fieldDetection.retryAttempts');
    this.settings.population.delayBetweenFields = this.validateNumber(this.settings.population.delayBetweenFields, 100, 'population.delayBetweenFields');
    this.settings.validation.waitForValidation = this.validateNumber(this.settings.validation.waitForValidation, 2000, 'validation.waitForValidation');
    
    this.settings.fieldDetection.fuzzyMatching = this.validateBoolean(this.settings.fieldDetection.fuzzyMatching, true, 'fieldDetection.fuzzyMatching');
    this.settings.population.triggerEvents = this.validateBoolean(this.settings.population.triggerEvents, true, 'population.triggerEvents');
    this.settings.population.skipReadonly = this.validateBoolean(this.settings.population.skipReadonly, true, 'population.skipReadonly');
    this.settings.validation.retryOnError = this.validateBoolean(this.settings.validation.retryOnError, true, 'validation.retryOnError');
    this.settings.validation.skipInvalidFields = this.validateBoolean(this.settings.validation.skipInvalidFields, false, 'validation.skipInvalidFields');
    this.settings.autoSubmit = this.validateBoolean(this.settings.autoSubmit, false, 'autoSubmit');
  }

  /**
   * @description Validates a number, falling back to a default if invalid.
   * @param {*} value - The value to validate.
   * @param {number} defaultValue - The default value to use if validation fails.
   * @param {string} name - The name of the setting for logging.
   * @returns {number}
   */
  validateNumber(value, defaultValue, name) {
    if (typeof value !== 'number' || value < 0) {
      console.warn(`Invalid value for ${name}. Must be a non-negative number. Using default: ${defaultValue}.`);
      return defaultValue;
    }
    return value;
  }

  /**
   * @description Validates a boolean, falling back to a default if invalid.
   * @param {*} value - The value to validate.
   * @param {boolean} defaultValue - The default value to use if validation fails.
   * @param {string} name - The name of the setting for logging.
   * @returns {boolean}
   */
  validateBoolean(value, defaultValue, name) {
    if (typeof value !== 'boolean') {
      console.warn(`Invalid value for ${name}. Must be a boolean. Using default: ${defaultValue}.`);
      return defaultValue;
    }
    return value;
  }

  /**
   * @description Gets the current configuration settings.
   * @returns {object}
   */
  get() {
    return this.settings;
  }

  /**
   * @description Updates the configuration with new settings.
   * @param {object} newConfig - The new configuration settings to merge.
   */
  update(newConfig) {
    this.settings = this.deepMerge(this.settings, newConfig);
    this.validate();
    console.log("Configuration updated:", this.settings);
    // In a real application, we would emit an event here to notify other components.
  }
} 