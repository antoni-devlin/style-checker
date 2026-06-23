chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkLinks") {
    checkLinks(request.urls)
      .then((results) => {
        sendResponse({ success: true, results });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function checkLinks(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const response = await Promise.race([
        fetch(url, { method: "HEAD" }).catch(() =>
          // If HEAD fails, try a GET
          fetch(url, { method: "GET" }),
        ),
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000),
        ),
      ]);

      results.push({
        href: url,
        status: response.status,
        isBroken: response.status < 200 || response.status >= 300,
      });
    } catch (error) {
      results.push({
        href: url,
        status: error.message || "Error",
        isBroken: false, // Errors here don't necessarily mean the link is broken, so don't count this as broken. Doesn't handle "link is broken, and something went wrong with the script"
      });
    }
  }

  return results;
}
