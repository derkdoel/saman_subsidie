// background.js
// Handles extension lifecycle and acts as a central message hub.

// On install, set up default configuration
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    config: {
      autoSubmit: false,
      // Add other default config values here
    }
  });
  console.log('Eloket Form Filler extension installed.');
});

// Listen for messages from content scripts or other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background script:', request);

  if (request.action === "fillForm") {
    // Programmatically inject scripts and then send message
    injectScriptsAndSendMessage(request, sendResponse);
    return true; // Keep the message channel open for the asynchronous response
  }
  
  // Handle other actions like getting config, etc.
  if (request.action === "getConfig") {
    chrome.storage.sync.get("config", (data) => {
      sendResponse(data.config);
    });
    return true;
  }
  
  // Existing native messaging listener
  if (request.action === "fillWithSelenium") {
    sendNativeMessage({ url: sender.tab.url, data: request.data }, (response) => {
      sendResponse(response);
    });
    return true;
  }

  return false; // No async response
});

function injectScriptsAndSendMessage(request, sendResponse) {
  const scripts = [
    "lib/Configuration.js",
    "lib/FieldDetector.js",
    "lib/DataPopulator.js",
    "lib/DynamicContentHandler.js",
    "lib/ValidationHandler.js",
    "lib/FormNavigator.js",
    "lib/ErrorRecovery.js",
    "lib/FormFillerCoordinator.js",
    "lib/EloketFormFiller.js",
    "content_scripts/content.js"
  ];

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (!tabs[0] || tabs[0].id === undefined) {
      sendResponse({ error: "No active tab found." });
      return;
    }
    const tabId = tabs[0].id;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: scripts,
      });

      // After scripts are injected, send the message
      chrome.tabs.sendMessage(tabId, request, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response);
        }
      });
    } catch (err) {
      console.error(`Failed to inject scripts: ${err}`);
      sendResponse({ error: `Failed to inject scripts: ${err.message}` });
    }
  });
}

// Function to send a message to the native host
function sendNativeMessage(message, callback) {
  const hostName = "com.saman_subsidie.eloket_form_filler";
  
  console.log('Sending message to native host:', message);
  chrome.runtime.sendNativeMessage(hostName, message, (response) => {
    if (chrome.runtime.lastError) {
      const errorMsg = `Native messaging failed: ${chrome.runtime.lastError.message}`;
      console.error(errorMsg);
      if (callback) callback({ error: errorMsg, details: "Check browser console and host logs for more info." });
      return;
    }
    console.log('Received response from native host:', response);
    if (callback) callback(response);
  });
}

// Example: Listen for a message from the content script to trigger the native host
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillWithSelenium") {
    sendNativeMessage(
      { url: request.url, data: request.data },
      (response) => {
        sendResponse(response);
      }
    );
    return true; // Indicates that the response is sent asynchronously
  }
}); 