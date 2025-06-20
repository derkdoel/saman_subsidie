// content_scripts/main.js
// This script runs on the target page and handles DOM interaction.

console.log("Eloket Form Filler content script loaded.");

// Send a message to the background script to announce its presence
chrome.runtime.sendMessage({ action: "GREETING_FROM_CONTENT" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Error sending message:', chrome.runtime.lastError);
  } else {
    console.log("Response from background:", response.reply);
  }
});

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content script:", message);

  // Example: Action to trigger form filling
  if (message.action === "FILL_FORM_ACTION") {
    // Logic to start form filling would go here
    console.log("Received request to fill form with data:", message.data);
    sendResponse({ status: "Form filling started" });
  }

  return true;
}); 