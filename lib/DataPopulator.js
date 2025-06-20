/**
 * @class DataPopulator
 * @description Handles the population of form fields with data by closely mimicking user interaction.
 */
class DataPopulator {
  /**
   * @param {object} fieldMapping - A map of JSON keys to found HTML elements.
   * @param {object} jsonData - The data to populate the form with.
   * @param {object} config - Configuration options, e.g., { delay: 100 }.
   */
  constructor(fieldMapping, jsonData, config = {}) {
    this.fieldMapping = fieldMapping;
    this.jsonData = jsonData;
    this.config = {
      delay: 100, // Default delay between populating fields
      ...config,
    };
    this.addressKeys = {
        postcode: 'Postcode',
        huisnummer: 'Huisnummer',
        toevoeging: 'Toevoeging',
        straat: 'Straat',
        plaats: 'Plaats'
    };
  }

  /**
   * Populates all fields based on the mapping and data.
   */
  async populateAll() {
    console.log('Starting data population...');
    
    // Handle address fields with special sequencing
    await this._populateAddressGroup();

    // Handle all other fields
    for (const key in this.fieldMapping) {
      if (this.jsonData.hasOwnProperty(key) && !Object.values(this.addressKeys).includes(key)) {
        try {
          const element = this.fieldMapping[key];
          const value = this.jsonData[key];

          if (!element) {
            console.warn(`No element found for key: ${key}. Skipping.`);
            continue;
          }

          await this.populateField(element, value);
          await this.wait(this.config.delay);
        } catch (error) {
          console.error(`Failed to populate field for key: ${key}.`, {
            error,
            element: this.fieldMapping[key],
          });
        }
      }
    }
    console.log('Data population complete.');
  }

  async _populateAddressGroup() {
    const { postcode, huisnummer, toevoeging, straat, plaats } = this.addressKeys;

    const postcodeEl = this.fieldMapping[postcode];
    const huisnummerEl = this.fieldMapping[huisnummer];
    const toevoegingEl = this.fieldMapping[toevoeging];
    const straatEl = this.fieldMapping[straat];
    const plaatsEl = this.fieldMapping[plaats];

    // Only proceed if the trigger fields exist
    if (!postcodeEl || !huisnummerEl) {
      console.log('Postcode or Huisnummer field not found, skipping special address handling.');
      // Fallback to normal filling for any address fields that were found
      for(const key of Object.values(this.addressKeys)) {
        if (this.fieldMapping[key] && this.jsonData[key]) {
          await this.populateField(this.fieldMapping[key], this.jsonData[key]);
        }
      }
      return;
    }

    // 1. Fill the trigger fields
    console.log('Populating address trigger fields...');
    await this.populateField(postcodeEl, this.jsonData[postcode]);
    await this.populateField(huisnummerEl, this.jsonData[huisnummer]);
    if (toevoegingEl && this.jsonData[toevoeging]) {
      await this.populateField(toevoegingEl, this.jsonData[toevoeging]);
    }
    
    // 2. Wait for autocomplete
    console.log('Waiting for address autocomplete...');
    await this.wait(2000); // Wait 2 seconds for API call and DOM update

    // 3. Conditionally fill Straat and Plaats
    if (straatEl && !straatEl.value && this.jsonData[straat]) {
        console.log('Straat not auto-filled, populating manually.');
        await this.populateField(straatEl, this.jsonData[straat]);
    }
    if (plaatsEl && !plaatsEl.value && this.jsonData[plaats]) {
        console.log('Plaats not auto-filled, populating manually.');
        await this.populateField(plaatsEl, this.jsonData[plaats]);
    }
  }

  /**
   * Populates a single form field based on its type. Now an async function.
   * @param {HTMLElement|NodeList} element - The form element or a NodeList (for radios).
   * @param {*} value - The value to set.
   */
  async populateField(element, value) {
    if (!element) return;

    const el = element.nodeName ? element : element[0];
    if (!el) return;

    const elementType = el.type ? el.type.toLowerCase() : el.nodeName.toLowerCase();

    switch (elementType) {
      case 'radio':
        this._populateRadio(element, value);
        break;
      case 'checkbox':
        this._populateCheckbox(el, value);
        break;
      case 'select-one':
      case 'select-multiple':
        this._populateSelect(element, value);
        this.triggerEvents(element, ['change', 'blur']); // Selects still benefit from event triggers
        break;
      default:
        // Await the new human-like typing method for all text-based fields
        await this._populateText(element, value);
        break;
    }
  }

  /**
   * A new async method to simulate human typing.
   */
  async _populateText(element, value) {
    element.focus();
    element.click();
    element.value = ''; // Clear the field first

    for (const char of String(value)) {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      await this.wait(Math.random() * 90 + 35); // Wait 35-125ms between characters
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Now uses .click() for maximum reliability.
   */
  _populateCheckbox(element, value) {
    const shouldBeChecked = !!value;
    if (element.checked !== shouldBeChecked) {
      element.click();
    }
  }

  /**
   * Uses .click() and includes the robust detection logic from before.
   */
  _populateRadio(elements, value) {
    if (elements.nodeName === 'INPUT' && elements.type === 'radio' && elements.name) {
      elements = document.getElementsByName(elements.name);
    }
    
    let optionToSelect = null;
    const valueStr = String(value).toLowerCase();

    for (const radio of Array.from(elements)) {
        const radioValue = String(radio.value).toLowerCase();
        if (radioValue === valueStr) { optionToSelect = radio; break; }
        if (radioValue.length === 1 && valueStr.startsWith(radioValue)) { optionToSelect = radio; break; }
        const parentLabel = radio.closest('label');
        if (parentLabel && parentLabel.textContent.trim().toLowerCase() === valueStr) { optionToSelect = radio; break; }
        if (radio.id) {
            const explicitLabel = document.querySelector(`label[for="${radio.id}"]`);
            if (explicitLabel && explicitLabel.textContent.trim().toLowerCase() === valueStr) { optionToSelect = radio; break; }
        }
        const container = radio.closest('.lip_checkbox');
        if (container && container.previousElementSibling && container.previousElementSibling.textContent.trim().toLowerCase() === valueStr) {
            optionToSelect = radio;
            break;
        }
    }

    if (optionToSelect && !optionToSelect.checked) {
      optionToSelect.click(); // Use .click() for the most reliable interaction
    } else if (!optionToSelect) {
      console.warn(`Could not find a matching radio option for value: "${value}"`);
    }
  }

  _populateSelect(element, value) {
    const valueStr = String(value).toLowerCase();
    const optionToSelect = Array.from(element.options).find(
      opt => String(opt.value).toLowerCase() === valueStr || opt.textContent.trim().toLowerCase() === valueStr
    );
    if (optionToSelect) {
      element.value = optionToSelect.value;
    } else {
      console.warn(`Could not find a matching select option for value: "${value}"`);
    }
  }

  triggerEvents(element, events) {
    events.forEach(eventName => {
      const event = new Event(eventName, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}