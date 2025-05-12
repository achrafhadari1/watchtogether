// Store detected video URLs
let detectedVideos = [];

// Listen for web requests to detect video files
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;

    // Check if the URL is a video file
    if (isVideoUrl(url) && !detectedVideos.includes(url)) {
      console.log("Detected video URL:", url);
      detectedVideos.push(url);

      // Limit the number of stored URLs to prevent memory issues
      if (detectedVideos.length > 10) {
        detectedVideos.shift();
      }

      // Notify the popup about the new video
      try {
        chrome.runtime.sendMessage({ action: "newVideo", url }).catch((err) => {
          // This error is expected when popup is not open
          console.log("Could not send message to popup (likely not open)");
        });
      } catch (err) {
        // Ignore errors when popup is not open
        console.log("Error sending message:", err);
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// Function to check if a URL is a video file
function isVideoUrl(url) {
  // Check for common video file extensions
  if (url.match(/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i)) {
    return true;
  }

  // Check for HLS streams
  if (url.match(/\.m3u8(\?|$)/i)) {
    return true;
  }

  // Check for DASH streams
  if (url.match(/\.mpd(\?|$)/i)) {
    return true;
  }

  // Check for content type in URL parameters (some streaming services include this)
  if (url.includes("video/mp4") || url.includes("video/webm")) {
    return true;
  }

  return false;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getVideos") {
    sendResponse({ videos: detectedVideos });
  }
  return true; // Keep the message channel open for sendResponse
});

// Clear detected videos when a tab is closed or refreshed
chrome.tabs.onRemoved.addListener(() => {
  detectedVideos = [];
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && /^https?:/.test(tab.url)) {
    // Optional: Clear previous detections when the page changes
    detectedVideos = [];

    // Optional: Log for debugging
    console.log("Tab updated, reinjecting content script on:", tab.url);

    chrome.scripting
      .executeScript({
        target: { tabId },
        files: ["content.js"],
      })
      .catch((err) => {
        console.warn("Could not inject content script:", err);
      });
  }
});
