// Background script for handling fetch requests (bypass CORS)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkLinks") {
    checkLinks(request.urls)
      .then((results) => {
        sendResponse({ success: true, results });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // indicates we'll send response asynchronously
  }
});

async function checkLinks(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const response = await Promise.race([
        fetch(url, { method: "HEAD" }).catch(() =>
          // If HEAD fails, try GET
          fetch(url, { method: "GET" })
        ),
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000)
        ),
      ]);

      results.push({
        href: url,
        status: response.status,
        isBroken: response.status < 200 || response.status >= 300,
      });
    } catch (error) {
      // Network error, timeout, or other failure
      results.push({
        href: url,
        status: error.message || "Error",
        isBroken: false, // don't count errors as broken
      });
    }
  }

  return results;
}
