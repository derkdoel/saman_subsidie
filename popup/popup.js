document.addEventListener('DOMContentLoaded', () => {
  const fillFormBtn = document.getElementById('fillFormBtn');
  const fillWithSeleniumBtn = document.getElementById('fillWithSeleniumBtn');
  const jsonDataInput = document.getElementById('jsonData');
  const statusDiv = document.getElementById('status');

  fillFormBtn.addEventListener('click', () => {
    handleFillRequest('fillForm');
  });

  fillWithSeleniumBtn.addEventListener('click', () => {
    handleFillRequest('fillWithSelenium');
  });

  function handleFillRequest(action) {
    const jsonText = jsonDataInput.value;
    if (!jsonText) {
      statusDiv.textContent = 'Please paste JSON data.';
      return;
    }

    try {
      const data = JSON.parse(jsonText);
      statusDiv.textContent = 'Filling form...';

      chrome.runtime.sendMessage({ action, data }, (response) => {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
        } else if (response && response.error) {
          statusDiv.textContent = `Error: ${response.error}`;
        } else {
          statusDiv.textContent = 'Form filling process initiated. Check console for details.';
          console.log('Response from background:', response);
        }
      });
    } catch (e) {
      statusDiv.textContent = 'Invalid JSON data.';
      console.error("Invalid JSON:", e);
    }
  }
}); 