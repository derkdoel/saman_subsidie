document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  const autoSubmitCheckbox = document.getElementById('autoSubmit');
  const statusDiv = document.getElementById('status');

  // Load current settings
  chrome.storage.sync.get('config', (data) => {
    if (data.config) {
      autoSubmitCheckbox.checked = !!data.config.autoSubmit;
    }
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    const config = {
      autoSubmit: autoSubmitCheckbox.checked
    };
    
    chrome.storage.sync.set({ config }, () => {
      statusDiv.textContent = 'Options saved.';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 1500);
    });
  });
}); 