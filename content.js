// Define the 10 style rules from the GOV.UK style guide
const styleRules = [
  {
    name: "Don't use full stops in abbreviations (BBC, not B.B.C.)",
    regex: /\b[A-Z]\.[A-Z]\.(?:[A-Z]\.)*\b/,
  },
  {
    name: "Don't use decimals in a whole currency amount (£75, not £75.00)",
    regex: /£\d+\.00\b/,
  },
  {
    name: "Don't use hyphens in a sort code (12 23 56, not 12-23-56)",
    regex: /\b\d{2}-\d{2}-\d{2}\b/,
  },
  {
    name: "Use 'select' instead of 'click' for a UI element instruction",
    regex: /\bclick\s+(?:on\s+)?(?:the\s+)?['"]?[A-Z][A-Za-z\s]+['"]?\b/i,
  },
  {
    name: "Don't use negative contractions (do not, no don't)",
    regex: /\b(can't|don't|won't|shouldn't|couldn't|wouldn't)\b/i,
  },
  {
    name: "Use 'or' instead of a slashes (3 or 4, not 3/4)",
    regex: /(?<!\/[^\s]*)\b\w+\/\w+\b(?!\.\w+)/,
  },
  {
    name: "Don't hyphenate 'A-level' (A Level, not A-Level - level should be lower case)",
    regex: /\bA-level\b/i,
  },
  {
    name: "Don't use apostrophes to pluralise acronyms/qualifications (GCSEs not GCSEs)",
    regex: /\b(GCSE|A\*|SME|URL)('s)\b/,
  },
  {
    name: "Don't use hyphens in a date or time range, use 'to' instead (10am to 5pm, not 10am-5pm)",
    regex: /\b(\d+(?:am|pm)?)\s*[-–—]\s*(\d+(?:am|pm)?)\b/,
  },
  {
    name: "Don't use 'in order to' (use 'to' instead)",
    regex: /\bin\s+order\s+to\b/i,
  },
];

// Global map of violation occurrences so sidebar links can reference them
window.__govukStyleViolations = window.__govukStyleViolations || {};

// Global map of broken links so sidebar links can reference them
window.__govukBrokenLinks = window.__govukBrokenLinks || {};

// Function to update the sidebar UI with found violations
function updateSidebarUI(foundViolations) {
  // Find the user's existing sidebar container
  const sidebarContainer = document.querySelector(".sidebar-components");

  if (!sidebarContainer) {
    console.warn(
      "Lorem Checker: Target container '.sidebar-components' not found on this page."
    );
    return;
  }

  // Look for our specific results wrapper, or build it if missing
  let reportDiv = document.getElementById("govuk-style-reporter");
  if (!reportDiv) {
    reportDiv = document.createElement("div");
    reportDiv.id = "govuk-style-reporter";
    reportDiv.style.marginTop = "15px";
    reportDiv.style.padding = "12px";
    reportDiv.style.borderLeft = "4px solid #d4351c";
    reportDiv.style.backgroundColor = "#f8f8f8";
    reportDiv.style.fontFamily = "Arial, sans-serif";
    sidebarContainer.appendChild(reportDiv);
  }

  // If no violations are found, clear and hide the element entirely
  if (!foundViolations || foundViolations.length === 0) {
    reportDiv.style.display = "none";
    reportDiv.innerHTML = "";
    return;
  }

  // Build out the dynamic checklist showing only triggered violations
  reportDiv.style.display = "block";
  let htmlContent = `<h3 style="margin: 0 0 8px 0; font-size: 14px; color: #d4351c; font-weight: bold;">Style Issues Found:</h3>`;
  htmlContent += `<ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #0b0c0c; line-height: 1.4;">`;

  // Group occurrences by rule name
  const grouped = {};
  foundViolations.forEach((occ) => {
    grouped[occ.name] = grouped[occ.name] || [];
    grouped[occ.name].push(occ);
  });

  Object.keys(grouped).forEach((ruleName) => {
    htmlContent += `<li style="margin-bottom: 6px;"><strong style="font-weight:600;">${ruleName}</strong><ul style="margin:4px 0 0 12px; padding:0; list-style: none;">`;
    grouped[ruleName].forEach((occ) => {
      const id = "govuk-violation-" + Math.random().toString(36).substr(2, 9);
      window.__govukStyleViolations[id] = {
        textarea: occ.textarea,
        start: occ.start,
        end: occ.end,
      };
      const snippet = (occ.snippet || "")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      htmlContent += `<li style="margin-bottom:4px;"><span style="color:#0b0c0c;">…${snippet}…</span> <a href="#" class="govuk-violation-jump" data-violation-id="${id}" style="margin-left:8px; color:#005ea5; text-decoration:underline;">Jump</a></li>`;
    });
    htmlContent += `</ul></li>`;
  });

  htmlContent += `</ul>`;
  htmlContent += `<a href="https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/" target="_blank" style="display:inline-block; margin-bottom: 12px; color:#005ea5; text-decoration:underline;">View GOV.UK style guide</a>`;
  htmlContent += `<button type="button" id="govuk-check-links-btn" style="display:block; margin-top:12px; padding:8px 12px; background-color:#005ea5; color:white; border:none; border-radius:3px; font-size:13px; cursor:pointer; font-weight:600;">Check for broken links</button>`;
  reportDiv.innerHTML = htmlContent;

  // Click handler (event delegation) for Jump links
  reportDiv.addEventListener("click", async (e) => {
    const target = e.target;
    if (
      target &&
      target.classList &&
      target.classList.contains("govuk-violation-jump")
    ) {
      e.preventDefault();
      const id = target.dataset.violationId;
      const occ = window.__govukStyleViolations[id];
      if (!occ) return;

      try {
        // Ensure containing accordion is open before focusing/scrolling
        await openAccordionForElement(occ.textarea);
        occ.textarea.focus();
        occ.textarea.setSelectionRange(occ.start, occ.end);

        // Scroll approximate position into view: use ratio of chars
        const ratio = occ.start / Math.max(1, occ.textarea.value.length);
        occ.textarea.scrollTop = ratio * occ.textarea.scrollHeight;

        // Briefly flash background to draw attention
        const origBg = occ.textarea.style.backgroundColor;
        occ.textarea.style.backgroundColor = "#fff6f6";
        setTimeout(() => {
          occ.textarea.style.backgroundColor = origBg;
        }, 700);
      } catch (err) {
        console.warn("GovUK style reporter: could not jump to violation", err);
      }
    }
  });
}

// Function to scan all document textareas against the active rules array
function checkStyleViolations() {
  const textareas = document.querySelectorAll("textarea");
  const foundViolations = [];

  textareas.forEach((textarea) => {
    let textareaHasError = false;

    styleRules.forEach((rule) => {
      // ensure global search so we can collect multiple matches
      const flags = rule.regex && rule.regex.flags ? rule.regex.flags : "";
      const flagsWithG = flags.includes("g") ? flags : flags + "g";
      const re = new RegExp(rule.regex.source, flagsWithG);

      let m;
      while ((m = re.exec(textarea.value)) !== null) {
        const start = m.index;
        const end = start + (m[0] ? m[0].length : 0);
        const contextStart = Math.max(0, start - 20);
        const contextEnd = Math.min(textarea.value.length, end + 20);
        const snippet = textarea.value
          .substring(contextStart, contextEnd)
          .replace(/\s+/g, " ");
        foundViolations.push({
          name: rule.name,
          textarea,
          start,
          end,
          snippet,
        });
        textareaHasError = true;

        // guard against zero-length matches causing infinite loop
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    });

    // Provide immediate visual feedback on the invalid textarea
    if (textareaHasError) {
      textarea.style.border = "2px solid #d4351c";
      textarea.style.outline = "none";
    } else {
      textarea.style.border = "";
    }
  });

  // Push updates directly down into our custom sidebar block
  updateSidebarUI(foundViolations);
}

// Initialize on page load
checkStyleViolations();

// Watch input changes dynamically across elements as the user edits text
document.addEventListener("input", (event) => {
  if (event.target.tagName.toLowerCase() === "textarea") {
    checkStyleViolations();
  }
});

// Function to display broken links in the sidebar
function displayBrokenLinksUI(brokenLinks) {
  const sidebarContainer = document.querySelector(".sidebar-components");
  if (!sidebarContainer) return;

  let brokenLinksDiv = document.getElementById("govuk-broken-links-reporter");
  if (!brokenLinksDiv) {
    brokenLinksDiv = document.createElement("div");
    brokenLinksDiv.id = "govuk-broken-links-reporter";
    brokenLinksDiv.style.marginTop = "15px";
    brokenLinksDiv.style.padding = "12px";
    brokenLinksDiv.style.borderLeft = "4px solid #d4351c";
    brokenLinksDiv.style.backgroundColor = "#f8f8f8";
    brokenLinksDiv.style.fontFamily = "Arial, sans-serif";
    sidebarContainer.appendChild(brokenLinksDiv);
  }

  if (!brokenLinks || brokenLinks.length === 0) {
    brokenLinksDiv.style.display = "block";
    brokenLinksDiv.innerHTML = `<h3 style="margin: 0 0 8px 0; font-size: 14px; color: #0b7f1f; font-weight: bold;">✓ No broken links found</h3>`;
    return;
  }

  brokenLinksDiv.style.display = "block";
  let htmlContent = `<h3 style="margin: 0 0 8px 0; font-size: 14px; color: #d4351c; font-weight: bold;">Broken Links Found:</h3>`;
  htmlContent += `<ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #0b0c0c; line-height: 1.4;">`;

  brokenLinks.forEach((link) => {
    const id = "govuk-broken-link-" + Math.random().toString(36).substr(2, 9);
    window.__govukBrokenLinks[id] = {
      textarea: link.textarea,
      href: link.href,
      status: link.status,
    };
    const hrefEscaped = (link.href || "")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    htmlContent += `<li style="margin-bottom:4px;"><span style="color:#0b0c0c;">${hrefEscaped}</span> <span style="color:#666; font-size:12px;">(${link.status})</span> <a href="#" class="govuk-broken-link-jump" data-link-id="${id}" style="margin-left:8px; color:#005ea5; text-decoration:underline;">Jump</a></li>`;
  });

  htmlContent += `</ul>`;
  brokenLinksDiv.innerHTML = htmlContent;

  // Click handler for broken link jumps
  brokenLinksDiv.addEventListener("click", async (e) => {
    const target = e.target;
    if (
      target &&
      target.classList &&
      target.classList.contains("govuk-broken-link-jump")
    ) {
      e.preventDefault();
      const id = target.dataset.linkId;
      const link = window.__govukBrokenLinks[id];
      if (!link) return;

      try {
        await openAccordionForElement(link.textarea);
        link.textarea.focus();

        // Find and select the URL in the textarea
        const start = link.textarea.value.indexOf(link.href);
        if (start !== -1) {
          const end = start + link.href.length;
          link.textarea.setSelectionRange(start, end);

          // Scroll approximate position into view: use ratio of chars
          const ratio = start / Math.max(1, link.textarea.value.length);
          link.textarea.scrollTop = ratio * link.textarea.scrollHeight;
        } else {
          link.textarea.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Briefly flash background to draw attention
        const origBg = link.textarea.style.backgroundColor;
        link.textarea.style.backgroundColor = "#fff6f6";
        setTimeout(() => {
          link.textarea.style.backgroundColor = origBg;
        }, 700);
      } catch (err) {
        console.warn(
          "GovUK style reporter: could not jump to broken link",
          err
        );
      }
    }
  });
}

// Function to check for broken links
async function checkBrokenLinks() {
  const brokenLinks = [];
  const toCheck = [];
  const urlTextareaMap = {}; // map URL to textarea for linking results back

  // Extract URLs from textareas only
  const textareas = document.querySelectorAll("textarea");
  const urlRegex = /https?:\/\/[^\s\)]+/g;

  textareas.forEach((textarea) => {
    const matches = textarea.value.matchAll(urlRegex);
    for (const match of matches) {
      const url = match[0];
      toCheck.push(url);
      if (!urlTextareaMap[url]) {
        urlTextareaMap[url] = textarea;
      }
    }
  });

  if (toCheck.length === 0) {
    displayBrokenLinksUI([]);
    return;
  }

  // Update UI to show checking is in progress
  const button = document.getElementById("govuk-check-links-btn");
  const originalButtonText = button
    ? button.textContent
    : "Check for broken links";
  if (button) button.textContent = "Checking links...";
  if (button) button.disabled = true;

  try {
    // Send URLs to background script for checking
    const response = await chrome.runtime.sendMessage({
      action: "checkLinks",
      urls: toCheck,
    });

    if (response.success) {
      // Map results back to textareas and filter broken links
      response.results.forEach((result) => {
        if (result.isBroken) {
          brokenLinks.push({
            textarea: urlTextareaMap[result.href],
            href: result.href,
            status: result.status,
          });
        }
      });
    } else {
      console.error("Error checking links:", response.error);
    }
  } catch (err) {
    console.error("Error communicating with background script:", err);
  }

  // Restore button
  if (button) {
    button.textContent = originalButtonText;
    button.disabled = false;
  }

  // Display results
  displayBrokenLinksUI(brokenLinks);
}

// Helper function to open accordion for any element (used by both violations and broken links)
function openAccordionForElement(el) {
  return new Promise((resolve) => {
    if (!el || !el.closest) return resolve();
    const content =
      el.closest(".govuk-accordion__section-content") || el.closest("details");
    if (!content) return resolve();

    const isOpen =
      !(content.hasAttribute && content.hasAttribute("hidden")) &&
      !content.hidden;
    if (isOpen) return resolve();

    const toggle =
      (content.id &&
        document.querySelector(`[aria-controls="${content.id}"]`)) ||
      (content.parentElement &&
        content.parentElement.querySelector(
          ".govuk-accordion__section-button"
        )) ||
      null;

    if (!toggle) {
      try {
        if (content.tagName && content.tagName.toLowerCase() === "details") {
          content.open = true;
        }
      } catch (e) {}
      return resolve();
    }

    let resolved = false;
    const onResolved = () => {
      if (!resolved) {
        resolved = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve();
      }
    };

    const observer = new MutationObserver(() => {
      const nowOpen =
        (toggle.getAttribute &&
          toggle.getAttribute("aria-expanded") === "true") ||
        !(content.hasAttribute && content.hasAttribute("hidden")) ||
        !content.hidden;
      if (nowOpen) onResolved();
    });

    observer.observe(toggle, {
      attributes: true,
      attributeFilter: ["aria-expanded"],
    });
    observer.observe(content, {
      attributes: true,
      attributeFilter: ["hidden", "style"],
    });

    const timer = setTimeout(() => {
      onResolved();
    }, 500);

    try {
      if (
        toggle.getAttribute &&
        toggle.getAttribute("aria-expanded") === "false"
      )
        toggle.click();
      else onResolved();
    } catch (err) {
      onResolved();
    }
  });
}

// Delegate "Check for broken links" button clicks
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "govuk-check-links-btn") {
    e.preventDefault();
    checkBrokenLinks();
  }
});
