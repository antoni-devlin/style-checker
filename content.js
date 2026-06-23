// `style-rules.js` is loaded before this script by the manifest.
// It defines `styleRules` in the same content script environment.

// Map of instances of policies not being followed
window.__govukStyleViolations = window.__govukStyleViolations || {};

// Map of insteances of broken links
window.__govukBrokenLinks = window.__govukBrokenLinks || {};

// Function to update the sidebar when a style rule match is found
// Publisher has an exisiting element with class 'sidebar-components', so can inject stuff into it. Style checks and broken link stuff will appear under the "Preview" link
function updateSidebarUI(foundViolations) {
  // Finds sidebar
  const sidebarContainer = document.querySelector(".sidebar-components");

  if (!sidebarContainer) {
    console.warn(
      "Lorem Checker: Target container '.sidebar-components' not found on this page."
    );
    return;
  }

  // Find or create results div in sidebar
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

  // If nothing is wrong, hide the policy report div
  if (!foundViolations || foundViolations.length === 0) {
    reportDiv.style.display = "none";
    reportDiv.innerHTML = "";
    return;
  }

  // Build out list of style policies not met
  reportDiv.style.display = "block";
  let htmlContent = `<h3 style="margin: 0 0 8px 0; font-size: 14px; color: #d4351c; font-weight: bold;">Style Issues Found:</h3>`;
  htmlContent += `<ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #0b0c0c; line-height: 1.4;">`;

  // Group occurrences by rule name
  // TODO: Things are duplicated if the same rule is broken mulitple times. Could further group issues under the rule name.
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
  // Add single static link to style guide for easy reference.
  // TODO: Deeplink to the style guide section relevant to the rule being highlighted.
  htmlContent += `<a href="https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/" target="_blank" style="display:inline-block; margin-bottom: 12px; color:#005ea5; text-decoration:underline;">View GOV.UK style guide</a>`;
  htmlContent += `<button type="button" id="govuk-check-links-btn" style="display:block; margin-top:12px; padding:8px 12px; background-color:#005ea5; color:white; border:none; border-radius:3px; font-size:13px; cursor:pointer; font-weight:600;">Check for broken links</button>`;
  reportDiv.innerHTML = htmlContent;

  // Handle clicks to "jump" to the relevant content. Also opens accordions.
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
        // Open accordion before focusing and scrolling
        await openAccordionForElement(occ.textarea);
        occ.textarea.focus();
        occ.textarea.setSelectionRange(occ.start, occ.end);

        // Scroll position into view
        const ratio = occ.start / Math.max(1, occ.textarea.value.length);
        occ.textarea.scrollTop = ratio * occ.textarea.scrollHeight;

        // Briefly flash background - this might be annoying done long term
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
// This only checks "textarea" elements at the moment. Nothing in any other kind of text field will be checked. I think this is fine at the moment, but there are probably edge-cases.
function checkStyleViolations() {
  const textareas = document.querySelectorAll("textarea");
  const foundViolations = [];

  textareas.forEach((textarea) => {
    let textareaHasError = false;

    styleRules.forEach((rule) => {
      // make global
      const flags = rule.regex && rule.regex.flags ? rule.regex.flags : "";
      const flagsWithG = flags.includes("g") ? flags : flags + "g";
      const re = new RegExp(rule.regex.source, flagsWithG);

      let m;
      // Find matches
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

        // Ensure 0 lenght matches don't cause an infinite loop
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    });

    // highlight textarea border if it contains an issue
    if (textareaHasError) {
      textarea.style.border = "2px solid #d4351c";
      textarea.style.outline = "none";
    } else {
      textarea.style.border = "";
    }
  });

  // Push updates into the sidebar div
  updateSidebarUI(foundViolations);
}

// Run on pageload - could add delay, hasn't seemed to need it so far
checkStyleViolations();

// Reruns check on every input event - probably inefficient, could narrow this to inpput events on textareas only, or debounce?
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

  // Jump to broken links on click
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

        // Find and select broken URL
        const start = link.textarea.value.indexOf(link.href);
        if (start !== -1) {
          const end = start + link.href.length;
          link.textarea.setSelectionRange(start, end);

          // Scroll approximate position into view
          const ratio = start / Math.max(1, link.textarea.value.length);
          link.textarea.scrollTop = ratio * link.textarea.scrollHeight;
        } else {
          link.textarea.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Briefly flash background to draw attention - again, might get annoying
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

  // Update UI to show checking is in progress - could do with a cool unecessary spinner
  const button = document.getElementById("govuk-check-links-btn");
  const originalButtonText = button
    ? button.textContent
    : "Check for broken links";
  if (button) button.textContent = "Checking links...";
  if (button) button.disabled = true;

  try {
    // Send URLs to background script for checking - had to do this to get around CORS issues
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

  // Put the button back to normal after scan
  if (button) {
    button.textContent = originalButtonText;
    button.disabled = false;
  }

  // Show broken links in sidebar
  displayBrokenLinksUI(brokenLinks);
}

// Helper function to open accordion for any element
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

// Catch "Check for broken links" button clicks, and deletage
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "govuk-check-links-btn") {
    e.preventDefault();
    checkBrokenLinks();
  }
});
