# fill_multi_page_form_final.py
"""
The definitive script to fill the RVO form by handling all dynamic events
(BRP lookup and Address auto-fill) in a robust, sequential workflow.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from typing import Any, Mapping

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException

# --- UNIFIED FIELD MAP for All Pages ---
FIELD_MAP: Mapping[str, dict[str, Any]] = {
    # --- Page 1: Personal Details ---
    "bsn":      {"by": By.CSS_SELECTOR, "value": "input[id$='edBSNnummer']"},
    "initials": {"by": By.CSS_SELECTOR, "value": "input[id$='edVoorletters2']"},
    "prefix":   {"by": By.CSS_SELECTOR, "value": "input[id$='edTussenvoegsel2']"},
    "lastName": {"by": By.CSS_SELECTOR, "value": "input[id$='edAchternaam2']"},
    "gender":   {"field_type": "radio", "by": By.CSS_SELECTOR, "value": "input[name$='AanvragerPersoonGeslacht']"},
    "phone":    {"by": By.CSS_SELECTOR, "value": "input[id$='edTelefoonField3']"},
    "mobile":   {"by": By.CSS_SELECTOR, "value": "input[id$='edMobielField2']"},
    "email":    {"by": By.CSS_SELECTOR, "value": "input[id$='edEmailField3']"},
    "iban":     {"by": By.CSS_SELECTOR, "value": "input[id$='edIBAN']"},
    "page1_address": {
        "postalCode":   {"by": By.CSS_SELECTOR, "value": "input[id$='edPostcode']"},
        "houseNumber":  {"by": By.CSS_SELECTOR, "value": "input[id$='edHuisnummer2']"},
        "houseNumberSuffix": {"by": By.CSS_SELECTOR, "value": "input[id$='edToevoeging2']"},
        "street":     {"by": By.CSS_SELECTOR, "value": "input[id$='edStraat']"},
        "city":       {"by": By.CSS_SELECTOR, "value": "input[id$='edPlaats']"},
    },
    "correspondenceAddressSame": {"field_type": "radio", "by": By.CSS_SELECTOR, "value": "input[name$='bezoekAdresGelijk']"},
    "page1_next_button": {"by": By.ID, "value": "btnVolgendeTab"},

    # --- Page 2: Installation Address ---
    "address_is_correct_radio": {"field_type": "radio", "by": By.CSS_SELECTOR, "value": "input[name$='Adresafwijkend_JN']"},
    "page2_address": {
        "postalCode":   {"by": By.CSS_SELECTOR, "value": "input[id$='eddPostcode2']"},
        "houseNumber":  {"by": By.CSS_SELECTOR, "value": "input[id$='eddHuisnummer2']"},
        "houseNumberSuffix": {"by": By.CSS_SELECTOR, "value": "input[id$='eddToevoeging2']"},
        "street":     {"by": By.CSS_SELECTOR, "value": "input[id$='eddStraat2']"},
        "city":       {"by": By.CSS_SELECTOR, "value": "input[id$='eddPlaats2']"},
    },
    "page2_next_button": {"by": By.CSS_SELECTOR, "value": "input[id$='next'][value='Volgende']"},
}

# --- SHARED HELPER FUNCTIONS ---
def wait(drv: webdriver.Chrome, timeout: int = 15): return WebDriverWait(drv, timeout)
def load_json(path: str | Path) -> dict:
    with Path(path).expanduser().open(encoding="utf-8") as f: return json.load(f)
def fill_text_field(drv: webdriver.Chrome, cfg: Mapping[str, Any], value: Any):
    el = wait(drv).until(EC.element_to_be_clickable((cfg["by"], cfg["value"])))
    el.clear()
    el.send_keys(str(value))
def fill_radio_field(driver: webdriver.Chrome, cfg: Mapping[str, Any], value: Any):
    target_value = str(value)
    if cfg['value'].endswith('Adresafwijkend_JN'):
        is_correct = value if isinstance(value, bool) else (value.lower() == 'true')
        target_value = str(not is_correct).lower()
    elif value.lower() in ['man', 'vrouw']:
        target_value = 'M' if value.lower() == 'man' else 'V'
    elif value.lower() in ['ja', 'nee']:
        target_value = 'J' if value.lower() == 'ja' else 'N'

    radios = wait(driver).until(EC.presence_of_all_elements_located((cfg["by"], cfg["value"])))
    for el in radios:
        if el.get_attribute("value") == target_value:
            if not el.is_selected(): driver.execute_script("arguments[0].click();", el)
            return
    raise RuntimeError(f"Radio button for {cfg} with target value '{target_value}' not found.")

# --- PAGE 1 HANDLER ---
def handle_page_1_personal_details(driver: webdriver.Chrome, data: dict[str, Any]):
    print("\n--- Handling Page 1: Personal Details (Robust Sequential Workflow) ---")
    wait(driver).until(EC.visibility_of_element_located((FIELD_MAP["bsn"]["by"], FIELD_MAP["bsn"]["value"])))

    print("    [1/4] Triggering BRP lookup...")
    fill_text_field(driver, FIELD_MAP["bsn"], data["bsn"])
    try:
        print("    -> Waiting for name to auto-fill...")
        wait(driver, 10).until(EC.none_of(EC.text_to_be_present_in_element_value((FIELD_MAP["lastName"]["by"], FIELD_MAP["lastName"]["value"]), "")))
        print("    -> BRP lookup complete.")
    except TimeoutException:
        print("    -> WARNING: BRP auto-fill did not occur.")
    
    print("    [2/4] Filling stable personal details...")
    personal_keys = ["initials", "prefix", "lastName", "gender", "phone", "mobile", "email", "iban"]
    for key in personal_keys:
        if key in data and key in FIELD_MAP:
            cfg = FIELD_MAP[key]
            if cfg.get("field_type") == "radio": fill_radio_field(driver, cfg, data[key])
            else: fill_text_field(driver, cfg, data[key])
            print(f"       -> Filled: '{key}'")

    address_data = data.get("address")
    if address_data:
        print("    [3/4] Triggering address lookup...")
        addr_map = FIELD_MAP["page1_address"]
        fill_text_field(driver, addr_map["postalCode"], address_data["postalCode"])
        fill_text_field(driver, addr_map["houseNumber"], address_data["houseNumber"])
        if "houseNumberSuffix" in address_data and address_data["houseNumberSuffix"]:
            fill_text_field(driver, addr_map["houseNumberSuffix"], address_data["houseNumberSuffix"])
        try:
            print("    -> Waiting for street to auto-fill...")
            wait(driver, 10).until(EC.none_of(EC.text_to_be_present_in_element_value((addr_map["street"]["by"], addr_map["street"]["value"]), "")))
            print("    -> Address lookup complete.")
        except TimeoutException:
            print("    -> WARNING: Address auto-fill did not occur.")
        fill_text_field(driver, addr_map["street"], address_data["street"])
        fill_text_field(driver, addr_map["city"], address_data["city"])

    print("    [4/4] Filling remaining static fields...")
    if "correspondenceAddressSame" in data:
        fill_radio_field(driver, FIELD_MAP["correspondenceAddressSame"], data["correspondenceAddressSame"])
        print(f"       -> Filled: 'correspondenceAddressSame'")
    print("--- Page 1 complete. ---")

# --- PAGE 2 HANDLER ---
def handle_page_2_installation_address(driver: webdriver.Chrome, data: dict[str, Any]):
    print("\n--- Handling Page 2: Installation Address ---")
    wait(driver).until(EC.visibility_of_element_located((FIELD_MAP["address_is_correct_radio"]["by"], FIELD_MAP["address_is_correct_radio"]["value"])))
    is_correct = data.get("isAddressCorrect", False)
    fill_radio_field(driver, FIELD_MAP["address_is_correct_radio"], is_correct)
    print(f"    -> Selected 'Address Correct': {'Ja' if is_correct else 'Nee'}")
    if not is_correct:
        address_data = data.get("address", {})
        if not address_data: raise ValueError("JSON indicates new address needed, but 'address' object is missing.")
        addr_map = FIELD_MAP["page2_address"]
        fill_text_field(driver, addr_map["postalCode"], address_data["postalCode"])
        fill_text_field(driver, addr_map["houseNumber"], address_data["houseNumber"])
        if "houseNumberSuffix" in address_data and address_data["houseNumberSuffix"]:
            fill_text_field(driver, addr_map["houseNumberSuffix"], address_data["houseNumberSuffix"])
        try:
            print("    -> Waiting for address auto-fill...")
            wait(driver, 10).until(EC.none_of(EC.text_to_be_present_in_element_value((addr_map["street"]["by"], addr_map["street"]["value"]), "")))
            print("    -> Address auto-fill detected!")
        except TimeoutException: print("    -> WARNING: Address auto-fill did not occur.")
        fill_text_field(driver, addr_map["street"], address_data["street"])
        fill_text_field(driver, addr_map["city"], address_data["city"])
    print("--- Page 2 complete. ---")

# --- MAIN ORCHESTRATOR ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fills the multi-page RVO form.")
    parser.add_argument("json", help="Path to the unified JSON payload file.")
    parser.add_argument("--page", type=int, choices=[1, 2], help="Specify a single page to run for testing (1 or 2).")
    args = parser.parse_args()
    print("🚀 Attempting to connect to existing Chrome session on port 9222...")
    opts = Options()
    opts.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
    driver = webdriver.Chrome(service=Service(), options=opts)
    print(f"✅ Successfully connected to browser! Title: {driver.title}")
    try:
        full_data = load_json(args.json)
        if args.page == 1:
            handle_page_1_personal_details(driver, full_data.get("personalDetails", {}))
            print("\n✅ Testing for Page 1 complete.")
        elif args.page == 2:
            handle_page_2_installation_address(driver, full_data.get("installationAddress", {}))
            page2_next_button = wait(driver).until(EC.element_to_be_clickable((FIELD_MAP["page2_next_button"]["by"], FIELD_MAP["page2_next_button"]["value"])))
            page2_next_button.click()
            print("\n✅ Testing for Page 2 complete.")
        else:
            print("\n>>> Running full end-to-end sequence <<<")
            handle_page_1_personal_details(driver, full_data.get("personalDetails", {}))
            print("\nNavigating from Page 1 to Page 2...")
            page1_next_button = wait(driver).until(EC.element_to_be_clickable((FIELD_MAP["page1_next_button"]["by"], FIELD_MAP["page1_next_button"]["value"])))
            page1_next_button.click()
            handle_page_2_installation_address(driver, full_data.get("installationAddress", {}))
            print("\nNavigating from Page 2...")
            page2_next_button = wait(driver).until(EC.element_to_be_clickable((FIELD_MAP["page2_next_button"]["by"], FIELD_MAP["page2_next_button"]["value"])))
            page2_next_button.click()
            print("\n✅✅✅ Successfully completed all defined pages! ✅✅✅")
    except Exception as e:
        print(f"\n❌ An unexpected error occurred: {e}")