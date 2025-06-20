/**
 * @class FieldDetector
 * @description Scans the DOM to find form elements based on various matching strategies.
 * The detector's responsibility is to find the most likely element(s) for a given key.
 * The logic for how to fill the element (e.g., picking a radio button option)
 * belongs in the DataPopulator module.
 */
class FieldDetector {
  constructor() {
    this.matchers = [
      this.findById,
      this.findByName,
      this.findByLabelText,
      this.findByPlaceholderText,
      this.findByIdContains,
      this.findByNameContains,
      this.findBySemanticPatterns,
    ];
  }

  escapeCSSSelector(str) {
    if (!str) return '';
    // Escapes characters with special meaning in CSS selectors.
    // Via https://developer.mozilla.org/en-US/docs/Web/API/CSS/escape
    return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }

  findById(key) {
    return document.getElementById(key);
  }

  findByIdContains(key) {
    try {
      const escapedKey = this.escapeCSSSelector(key);
      return document.querySelector(`[id*="${escapedKey}" i]`);
    } catch (e) {
      console.error(`Error finding element by ID containing "${key}":`, e);
      return null;
    }
  }

  /**
   * Finds a form element by its corresponding label text.
   * Handles both explicit (for attribute) and implicit (wrapped) labels.
   * @param {string} key - The text content to match against a label.
   * @returns {HTMLElement|null} The associated form element or null.
   */
  findByLabelText(key) {
    const labels = document.getElementsByTagName('label');
    for (const label of labels) {
      // Normalize text and check for a match
      if (label.textContent.trim().toLowerCase().includes(key.toLowerCase())) {
        // Case 1: Explicit association using 'for' attribute
        if (label.htmlFor) {
          const element = document.getElementById(label.htmlFor);
          if (element) return element;
        }

        // Case 2: Implicit association by wrapping the input
        const input = label.querySelector('input, select, textarea');
        if (input) return input;
      }
    }
    return null;
  }

  /**
   * Finds a form element by its placeholder text.
   * @param {string} key - The text to match against a placeholder.
   * @returns {HTMLElement|null} The found element or null.
   */
  findByPlaceholderText(key) {
    const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
    for (const input of inputs) {
      if (input.placeholder.trim().toLowerCase().includes(key.toLowerCase())) {
        return input;
      }
    }
    return null;
  }

/**
   * Finds a form element by looking for common structural patterns,
   * such as a text node or span near an input within a shared container.
   * @param {string} key - The text to match against a nearby text node or element.
   * @returns {HTMLElement|null} The found element or null.
   */
findBySemanticPatterns(key) {
  const allTextNodes = document.evaluate("//text()", document, null, XPathResult.ANY_TYPE, null);
  let currentNode;
  while (currentNode = allTextNodes.iterateNext()) {
    if (currentNode.textContent.trim().toLowerCase().includes(key.toLowerCase())) {
      // Found a matching text node. Now look for a nearby input.
      let parent = currentNode.parentElement;
      for (let i = 0; i < 3 && parent; i++) { // Search up to 3 levels up
        const input = parent.querySelector('input, select, textarea');
        if (input) {
          // THE FIX: Return the input immediately upon finding it.
          // The previous check for an existing label was preventing detection
          // due to the presence of invisible accessibility labels.
          return input;
        }
        parent = parent.parentElement;
      }
    }
  }
  return null;
}

  /**
   * Finds a form element by its name.
   * @param {string} key - The name of the form element.
   * @returns {HTMLElement|NodeList|null} The found element(s) or null.
   */
  findByName(key) {
    const elements = document.getElementsByName(key);
    if (elements.length === 0) {
      return null;
    }

    // If it's a radio button group, the entire group is relevant. Return the NodeList.
    if (Array.from(elements).every(el => el.type === 'radio')) {
      return elements;
    }

    // For other cases (e.g., multiple text inputs with the same name), return the first element.
    return elements[0];
  }

  findByNameContains(key) {
    try {
      const escapedKey = this.escapeCSSSelector(key);
      const elements = document.querySelectorAll(`[name*="${escapedKey}" i]`);
      if (elements.length === 0) {
        return null;
      }
      if (elements.length === 1) {
        return elements[0];
      }
      // If it's a radio button group, the entire group is relevant.
      if (Array.from(elements).every(el => el.type === 'radio')) {
        return elements;
      }
      return elements[0]; // Return first for other cases
    } catch (e) {
      console.error(`Error finding element by name containing "${key}":`, e);
      return null;
    }
  }

  /**
   * Attempts to find a form element for a given key using all available strategies.
   * @param {string} key - The key to search for.
   * @returns {HTMLElement|NodeList|null} The found form element(s) or null.
   */
  findField(key) {
    for (const matcher of this.matchers) {
      try {
        const result = matcher.call(this, key);
        if (result && (result.length === undefined || result.length > 0)) {
          return result;
        }
      } catch (e) {
        console.error(`Error in matcher ${matcher.name} for key "${key}":`, e);
      }
    }
    return null;
  }
} 