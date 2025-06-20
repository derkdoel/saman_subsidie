/**
 * @class FormNavigator
 * @description Handles navigation for multi-step (wizard-style) forms.
 */
class FormNavigator {
  /**
   * @param {object} config - Configuration options for the navigator.
   * @param {boolean} [config.autoSubmit=false] - Whether to automatically submit the form on the last step.
   */
  constructor(config = {}) {
    this.config = {
      autoSubmit: false,
      ...config,
    };
    
    this.currentStep = 0;
    this.totalSteps = 0;
    this.nextStepAvailable = false;
    this.previousStepAvailable = false;
    this.dynamicContentHandler = new DynamicContentHandler();
  }

  /**
   * @description Analyzes the DOM to find navigation controls and determine the form structure.
   */
  detectFormStructure() {
    const nextButton = this.detectNextButton();
    const prevButton = this.detectPreviousButton();
    
    this.nextStepAvailable = !!nextButton;
    this.previousStepAvailable = !!prevButton;

    // A more sophisticated step indicator detection would go here.
    // For now, we'll assume a simple case.
    const stepIndicators = document.querySelectorAll('.step, [aria-current="step"]');
    if (stepIndicators.length > 0) {
      this.totalSteps = stepIndicators.length;
      stepIndicators.forEach((el, index) => {
        if (el.matches('[aria-current="step"], .active')) {
          this.currentStep = index + 1;
        }
      });
    }
  }

  /**
   * @description Finds the "next" or "continue" button on the page, ensuring it is visible.
   * @returns {HTMLElement|null}
   */
  detectNextButton() {
    const selectors = [
      'input#btnVolgendeTab',
      'input[type="submit"][value="Volgende"]',
      'input[type="button"][value="Volgende"]',
      'button',
      'a'
    ];

    const isVisible = (elem) => {
      if (!elem) return false;
      // Check if the element is connected to the DOM and has a size.
      return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length) &&
            window.getComputedStyle(elem).visibility !== 'hidden';
    };

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = (el.value || el.textContent || "").trim().toLowerCase();
        if (text.includes('volgende') && isVisible(el)) {
          console.log('Found visible "Next" button:', el);
          return el;
        }
      }
    }

    console.warn("Could not find a visible 'Next' button.");
    return null;
  }

  /**
   * @description Finds the "previous" or "back" button on the page.
   * @returns {HTMLElement|null}
   */
  detectPreviousButton() {
    const selectors = [
      'button[type="button"]',
      'input[type="button"]',
      'a[role="button"]',
    ];
    const keywords = ['previous', 'back', 'terug', 'vorige'];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = (el.innerText || el.value || el.textContent).toLowerCase();
        if (keywords.some(kw => text.includes(kw))) {
          return el;
        }
      }
    }
    return null;
  }

  /**
   * @description Navigates to the next step in the form.
   * @returns {Promise<void>}
   */
  async navigateNext() {
    this.detectFormStructure(); // Re-detect to ensure we have the latest button reference
    const nextButton = this.detectNextButton();
    if (!nextButton) {
      console.warn("Could not find 'next' button to navigate.");
      return;
    }

    nextButton.click();
    await this.waitForTransition();
    this.detectFormStructure(); // Re-detect to update state after navigation
  }

  /**
   * @description Navigates to the previous step in the form.
   * @returns {Promise<void>}
   */
  async navigatePrevious() {
    this.detectFormStructure(); // Re-detect to ensure we have the latest button reference
    const prevButton = this.detectPreviousButton();
    if (!prevButton) {
      console.warn("Could not find 'previous' button to navigate.");
      return;
    }
    
    prevButton.click();
    await this.waitForTransition();
    this.detectFormStructure(); // Re-detect to update state after navigation
  }

  /**
   * @description Pauses execution until the form step transition is complete.
   */
  async waitForTransition() {
    this.dynamicContentHandler.start();
    await this.dynamicContentHandler.waitForFormUpdates();
    this.dynamicContentHandler.stop();
  }

  /**
   * @description Gets the current step number.
   * @returns {number}
   */
  getCurrentStep() {
    return this.currentStep;
  }

  /**
   * @description Checks if the form is on its final step.
   * @returns {boolean}
   */
  isFormComplete() {
    return this.currentStep > 0 && this.currentStep === this.totalSteps;
  }

  /**
   * @description Calculates the completion progress as a percentage.
   * @returns {number}
   */
  getProgress() {
    if (this.totalSteps === 0) {
      return this.isFormComplete() ? 100 : 0;
    }
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  /**
   * @description Returns a snapshot of the current navigation state.
   * @returns {object}
   */
  getFormState() {
    return {
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      progress: this.getProgress(),
      nextStepAvailable: this.nextStepAvailable,
      previousStepAvailable: this.previousStepAvailable,
      isComplete: this.isFormComplete(),
    };
  }

  /**
   * @description Submits the form, typically on the last step.
   */
  submitForm() {
    const form = document.querySelector('form');
    if (form) {
      const submitButton = this.detectNextButton(); // The "next" button on the last step is often the submit button
      if (submitButton && submitButton.type === 'submit') {
         submitButton.click();
      } else {
         form.submit();
      }
      console.log('Form submitted.');
    } else {
      console.warn('Could not find form to submit.');
    }
  }

  /**
   * @description Finalizes the navigation process, submitting if configured.
   * @returns {object} The final state of the form.
   */
  complete() {
    if (this.isFormComplete() && this.config.autoSubmit) {
      this.submitForm();
    }
    console.log('Form navigation complete.');
    return this.getFormState();
  }
} 