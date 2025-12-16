// Get icon path based on color scheme (use opposite for contrast)
function getIconPath(isDark: boolean) {
  const folder = isDark ? "light" : "dark";
  return {
    16: `icons/${folder}/16.png`,
    32: `icons/${folder}/32.png`,
    64: `icons/${folder}/64.png`,
    128: `icons/${folder}/128.png`,
  };
}

// Update extension icon based on system color scheme
function updateIcon(isDark: boolean) {
  chrome.action.setIcon({ path: getIconPath(isDark) });
}

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "opentab-action",
    title: "Send to your devices",
    contexts: ["all", "action"],
  });

  // Set initial icon based on color scheme
  // Service workers can't access window.matchMedia, so default to light icon
  updateIcon(false);
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "opentab-action" && tab) {
    console.log("Context menu clicked on tab:", tab.id, tab.title);
    // Add your action here
  }
});

// Listen for color scheme changes from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "color-scheme-change") {
    updateIcon(message.isDark);
  }
});
