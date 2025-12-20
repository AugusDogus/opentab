console.log("content script loaded");

// Detect color scheme and notify background script
function notifyColorScheme() {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  chrome.runtime.sendMessage({ type: "color-scheme-change", isDark });
}

// Notify on load
notifyColorScheme();

// Listen for changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", notifyColorScheme);