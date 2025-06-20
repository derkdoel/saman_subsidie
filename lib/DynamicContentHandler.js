/**
 * @class DynamicContentHandler
 * @description Monitors the DOM for changes and AJAX activity to handle dynamic forms.
 */
class DynamicContentHandler {
  constructor() {
    this.observer = null;
    this.activeAjaxRequests = 0;
    this.originalFetch = window.fetch;
    this.originalXhrSend = XMLHttpRequest.prototype.send;
    this.debounceTimer = null;
    this.waitPromiseResolver = null;
  }

  /**
   * Initializes and starts the MutationObserver and AJAX interception.
   * @param {HTMLElement} targetNode - The DOM node to observe. Defaults to document.body.
   */
  start(targetNode = document.body) {
    if (this.observer) {
      this.stop();
    }
    
    this._instrumentAjax();

    const config = {
      childList: true,  // Watch for additions/removals of children
      subtree: true,    // Watch the entire subtree
      attributes: true, // Watch for attribute changes
      attributeFilter: ['style', 'class', 'hidden', 'disabled'] // Focus on relevant attributes
    };

    const callback = (mutationsList, observer) => {
      // We only care if nodes were added or removed, or attributes changed significantly.
      const hasMeaningfulChanges = mutationsList.some(m => m.type === 'childList' && m.addedNodes.length > 0);
      
      if (hasMeaningfulChanges) {
        this._onActivity();
      }
    };

    this.observer = new MutationObserver(callback);
    this.observer.observe(targetNode, config);
    console.log('DynamicContentHandler started observing DOM and AJAX.');
  }

  /**
   * Stops the MutationObserver and restores original AJAX methods.
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this._deinstrumentAjax();
    console.log('DynamicContentHandler stopped observing.');
  }

  /**
   * Returns a promise that resolves when the DOM and AJAX activity are idle.
   * @param {number} timeout - A safety timeout to prevent waiting indefinitely.
   * @returns {Promise<void>}
   */
  waitForFormUpdates(timeout = 5000) {
    return new Promise((resolve) => {
      this.waitPromiseResolver = resolve;

      // Safety net in case idle state is never reached
      const safetyTimeout = setTimeout(() => {
        if (this.waitPromiseResolver) {
          console.warn(`waitForFormUpdates timed out after ${timeout}ms.`);
          this.waitPromiseResolver();
          this.waitPromiseResolver = null;
        }
      }, timeout);

      // Overwrite resolver to clear the safety timeout
      const originalResolver = this.waitPromiseResolver;
      this.waitPromiseResolver = () => {
        clearTimeout(safetyTimeout);
        originalResolver();
      };
    });
  }

  _onActivity() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (this.activeAjaxRequests === 0) {
        console.log('System is idle.');
        if (this.waitPromiseResolver) {
          this.waitPromiseResolver();
          this.waitPromiseResolver = null;
        }
      }
    }, 300); // 300ms of inactivity is considered "idle"
  }

  _instrumentAjax() {
    const self = this;

    // Instrument fetch
    window.fetch = function(...args) {
      self.activeAjaxRequests++;
      self._onActivity();
      return self.originalFetch.apply(this, args).finally(() => {
        self.activeAjaxRequests--;
        self._onActivity();
      });
    };

    // Instrument XMLHttpRequest
    XMLHttpRequest.prototype.send = function(...args) {
      const xhr = this;
      self.activeAjaxRequests++;
      self._onActivity();
      
      xhr.addEventListener('loadend', () => {
        self.activeAjaxRequests--;
        self._onActivity();
      }, { once: true });
      
      return self.originalXhrSend.apply(this, args);
    };
  }

  _deinstrumentAjax() {
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.send = this.originalXhrSend;
  }
} 