from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import logging
import sys
import struct

# ... (existing imports)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class EloketFormFiller:
    def __init__(self, wait_timeout=10):
        """
        Initializes the EloketFormFiller, setting up the Selenium WebDriver.
        :param wait_timeout: The maximum time to wait for elements to appear.
        """
        self.wait_timeout = wait_timeout
        # ... (existing __init__ code)
        self.stats = {'fields_populated': 0, 'errors': 0}

    def find_field(self, key):
        """
        Attempts to find a form field using multiple strategies.
        :param key: The identifier for the field (e.g., from JSON data).
        :return: A WebElement if found, otherwise None.
        """
        strategies = [
            (By.ID, key),
            (By.NAME, key),
            (By.XPATH, f"//label[contains(., '{key}')]/following-sibling::*[1]"),
            (By.CSS_SELECTOR, f"[placeholder='{key}']"),
        ]

        for by, value in strategies:
            try:
                element = self.driver.find_element(by, value)
                if element.is_displayed():
                    print(f"Found field '{key}' by {by}.")
                    return element
            except NoSuchElementException:
                continue
        
        print(f"Could not find field '{key}'.")
        return None

    def populate_field(self, key, value):
        """
        Finds a field and populates it with the given value.
        :param key: The identifier for the field.
        :param value: The value to populate the field with.
        :return: True if successful, False otherwise.
        """
        element = self.find_field(key)
        if not element:
            return False

        try:
            tag_name = element.tag_name
            if tag_name == 'input':
                input_type = element.get_attribute('type')
                if input_type in ['text', 'email', 'password', 'tel', 'number', 'search', 'url']:
                    element.clear()
                    element.send_keys(value)
                elif input_type == 'checkbox':
                    if (value and not element.is_selected()) or (not value and element.is_selected()):
                        element.click()
                elif input_type == 'radio':
                    # For radio buttons, the 'key' might be the name, and 'value' the specific option to select.
                    radio_button = self.driver.find_element(By.XPATH, f"//input[@name='{key}' and @value='{value}']")
                    if not radio_button.is_selected():
                        radio_button.click()
            elif tag_name == 'select':
                select = Select(element)
                select.select_by_visible_text(str(value))
            elif tag_name == 'textarea':
                element.clear()
                element.send_keys(value)
            
            print(f"Successfully populated field '{key}'.")
            return True
        except Exception as e:
            print(f"Error populating field '{key}': {e}")
            return False

    def wait_for_element(self, by, value):
        """
        Waits for a single element to be present on the page.
        :param by: The locator strategy (e.g., By.ID).
        :param value: The locator value.
        :return: The WebElement if found, otherwise None.
        """
        try:
            return WebDriverWait(self.driver, self.wait_timeout).until(
                EC.presence_of_element_located((by, value))
            )
        except Exception as e:
            print(f"Timeout waiting for element ({by}, {value}): {e}")
            return None

    def wait_for_ajax(self):
        """
        Waits for jQuery AJAX requests to complete.
        """
        if self.driver:
            try:
                WebDriverWait(self.driver, self.wait_timeout).until(
                    lambda d: d.execute_script("return (window.jQuery != undefined) && (jQuery.active == 0)")
                )
                print("AJAX requests completed.")
            except Exception as e:
                print(f"Timeout waiting for AJAX to complete, or jQuery not found: {e}")

    def fill_form(self, url, data):
        """
        Main method to navigate to a URL and fill a form with the given data.
        :param url: The URL of the form to fill.
        :param data: A dictionary with field identifiers and values.
        :return: A dictionary with statistics of the operation.
        """
        if not self.driver:
            logging.error("WebDriver not initialized. Aborting.")
            return self.stats

        try:
            self.driver.get(url)
            logging.info(f"Navigated to {url}")
        except Exception as e:
            logging.error(f"Error navigating to {url}: {e}")
            self.stats['errors'] += 1
            return self.stats

        for key, value in data.items():
            try:
                if self.populate_field(key, value):
                    self.stats['fields_populated'] += 1
                else:
                    self.stats['errors'] += 1
            except Exception as e:
                logging.error(f"An unexpected error occurred while processing field '{key}': {e}")
                self.stats['errors'] += 1
        
        logging.info(f"Form filling completed. Stats: {self.stats}")
        return self.stats

def get_message():
    """
    Reads a message from standard input, decoding it from the native messaging format.
    """
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        sys.exit(0)
    message_length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_message(message_content):
    """
    Sends a message to standard output, encoding it for the native messaging format.
    """
    encoded_content = json.dumps(message_content).encode('utf-8')
    encoded_length = struct.pack('@I', len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()

if __name__ == '__main__':
    # It's a good practice to have a dedicated log file for the host
    log_file = 'native_host.log'
    logging.basicConfig(filename=log_file, level=logging.INFO, 
                        format='%(asctime)s - %(levelname)s - %(message)s')

    try:
        message = get_message()
        logging.info(f"Received message: {message}")
        
        url = message.get('url')
        data = message.get('data')

        if not url or not data:
            raise ValueError("URL and data are required in the message.")

        filler = EloketFormFiller()
        if not filler.driver:
            raise Exception("WebDriver could not be initialized.")

        stats = filler.fill_form(url, data)
        filler.close()
        send_message({'status': 'success', 'stats': stats})
        logging.info("Successfully processed message and sent response.")

    except json.JSONDecodeError as e:
        error_msg = f"Error decoding JSON: {e}"
        logging.error(error_msg)
        send_message({'status': 'error', 'message': error_msg})
    except (ValueError, KeyError) as e:
        error_msg = f"Invalid message format: {e}"
        logging.error(error_msg)
        send_message({'status': 'error', 'message': error_msg})
    except Exception as e:
        error_msg = f"An unexpected error occurred in the native host: {e}"
        logging.error(error_msg, exc_info=True) # Log stack trace
        send_message({'status': 'error', 'message': error_msg})
