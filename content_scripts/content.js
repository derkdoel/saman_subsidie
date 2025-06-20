console.log("Eloket Form Filler content script loaded.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm") {
    console.log("Received fillForm command with data:", request.data);

    // Get config from storage first
    chrome.storage.sync.get("config", (storageData) => {
      const config = storageData.config || {};
      const filler = new EloketFormFiller(config);
      
      filler.fillForm(request.data)
        .then(response => {
          console.log("Form filling complete:", response);
          sendResponse(response);
        })
        .catch(error => {
          console.error("Error during form filling:", error);
          sendResponse({ error: error.message });
        });
    });

    return true; // Indicates that the response is sent asynchronously
  }
}); 