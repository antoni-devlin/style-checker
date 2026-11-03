// `style-rules.js` is loaded before this script by the manifest.
// It defines `styleRules` in the same content script environment.

// Map of instances of policies not being followed
window.__govukStyleViolations = window.__govukStyleViolations || {};

// Map of insteances of broken links
window.__govukBrokenLinks = window.__govukBrokenLinks || {};

const POLICY_SETTINGS_KEY = "govukDisabledStyleRules";
let disabledStyleRuleIds = new Set();
let policySettingsLoaded = false;

function getPolicyCountText() {
  const activeCount = styleRules.filter(
    (rule) => !disabledStyleRuleIds.has(rule.id)
  ).length;
  return `Checking ${activeCount}/${styleRules.length} available style rules.`;
}

function getSidebarContainer() {
  return (
    document.querySelector(".sidebar-components--open") ||
    document.querySelector(".sidebar-components") ||
    document.querySelector(".link-check-report")
  );
}

// Function to update the sidebar when a style rule match is found
// Publisher has an exisiting element with class 'sidebar-components', so can inject stuff into it. Style checks and broken link stuff will appear under the "Preview" link
function updateSidebarUI(foundViolations) {
  const sidebarContainer = getSidebarContainer();

  if (!sidebarContainer) {
    console.warn(
      "No sidebar container found on this page."
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
    reportDiv.style.backgroundColor = "#f8f8f8";
    reportDiv.style.fontFamily = "Arial, sans-serif";
    sidebarContainer.appendChild(reportDiv);
  }

  // Keep the report and link checker available when there are no style issues.
  if (!foundViolations || foundViolations.length === 0) {
    reportDiv.style.display = "block";
    reportDiv.innerHTML = `
      <p class="govuk-body">No style issues found</p>
      <button class="govuk-button govuk-button--secondary" type="button" id="govuk-policy-settings-btn">Choose policies</button>
      <p class="govuk-body-s" id="govuk-policy-count">${getPolicyCountText()}</p>
      <button class="govuk-button govuk-button--secondary" type="button" id="govuk-check-links-btn">Check for broken links</button>
    `;
    return;
  }

  // Build out list of style policies not met
  reportDiv.style.display = "block";
  let htmlContent = `<h2 class="govuk-heading-m">Style Issues Found</h2><button class="govuk-button govuk-button--secondary" type="button" id="govuk-policy-settings-btn">Choose policies</button><p class="govuk-body-s" id="govuk-policy-count">${getPolicyCountText()}</p>`;

  // Group occurrences by rule name
  // TODO: Things are duplicated if the same rule is broken mulitple times. Could further group issues under the rule name.
  const grouped = {};
  foundViolations.forEach((occ) => {
    grouped[occ.name] = grouped[occ.name] || [];
    grouped[occ.name].push(occ);
  });

  Object.keys(grouped).forEach((ruleName) => {
    const ruleDescription = styleRules.find((rule) => rule.name === ruleName)?.description;
    const escapedDescription = ruleDescription
      ?.replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const descriptionIcon = escapedDescription
      ? `<button type="button" title="${escapedDescription}" aria-label="Rule description: ${escapedDescription}" style="width: 18px; height: 18px; margin-left: 6px; padding: 0; border: 1px solid #505a5f; border-radius: 50%; background: #fff; color: #505a5f; font: bold 12px Arial, sans-serif; line-height: 16px; vertical-align: middle; cursor: help;">i</button>`
      : "";
    htmlContent += `
    <section>
    <h3 class='govuk-heading-s'>${ruleName}${descriptionIcon}</h3>
    <ul class="govuk-list govuk-list--bullet">
    `
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
        htmlContent += `
        <li>
        <span>${snippet}</span>
        <a href="#" class="govuk-link govuk-violation-jump" data-violation-id="${id}">Jump</a>
        </li>
        `
      // htmlContent += `<li style="margin-bottom:4px;"><span style="color:#0b0c0c;">…${snippet}…</span> <a href="#" class="govuk-violation-jump" data-violation-id="${id}" style="margin-left:8px; color:#005ea5; text-decoration:underline;">Jump</a></li>`;
    });
    htmlContent += `</ul></section>`;
  });
  // Add single static link to style guide for easy reference.
  // TODO: Deeplink to the style guide section relevant to the rule being highlighted.
  htmlContent += `<a href="https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/" target="_blank" style="display:inline-block; margin-bottom: 12px; color:#005ea5; text-decoration:underline;">View GOV.UK style guide (opens in new tab)</a>`;
  htmlContent += `<button class="govuk-button govuk-button--secondary" type="button" id="govuk-check-links-btn">Check for broken links</button>`;
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
  if (!policySettingsLoaded) return;

  const textareas = document.querySelectorAll("textarea");
  const foundViolations = [];

  textareas.forEach((textarea) => {
    let textareaHasError = false;

    styleRules.forEach((rule) => {
      if (disabledStyleRuleIds.has(rule.id)) return;

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

function ensurePolicySettingsDialog() {
  let dialog = document.getElementById("govuk-policy-settings-dialog");
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.id = "govuk-policy-settings-dialog";
  dialog.setAttribute("aria-labelledby", "govuk-policy-settings-title");
  dialog.style.maxHeight = "80vh";
  dialog.style.maxWidth = "36em";
  dialog.style.overflowY = "auto";

  const title = document.createElement("h2");
  title.id = "govuk-policy-settings-title";
  title.className = "govuk-heading-m";
  title.textContent = "Choose style policies";
  dialog.appendChild(title);

  const description = document.createElement("p");
  description.className = "govuk-body";
  description.textContent =
    "Choose which policies to check. Your choices are saved in this browser.";
  dialog.appendChild(description);

  const status = document.createElement("p");
  status.id = "govuk-policy-settings-status";
  status.className = "govuk-body";
  status.setAttribute("role", "status");
  dialog.appendChild(status);

  const checkboxGroup = document.createElement("div");
  checkboxGroup.className = "govuk-checkboxes";
  checkboxGroup.setAttribute("data-module", "govuk-checkboxes");

  styleRules.forEach((rule) => {
    const item = document.createElement("div");
    item.className = "govuk-checkboxes__item";

    const checkbox = document.createElement("input");
    checkbox.className = "govuk-checkboxes__input";
    checkbox.type = "checkbox";
    checkbox.id = `govuk-policy-${rule.id}`;
    checkbox.dataset.policyId = rule.id;
    checkbox.checked = !disabledStyleRuleIds.has(rule.id);

    const label = document.createElement("label");
    label.className = "govuk-label govuk-checkboxes__label";
    label.htmlFor = checkbox.id;
    label.textContent = rule.name;

    item.append(checkbox, label);
    checkboxGroup.appendChild(item);
  });
  dialog.appendChild(checkboxGroup);

  const toggleAllButton = document.createElement("button");
  toggleAllButton.className = "govuk-button govuk-button--secondary";
  toggleAllButton.type = "button";
  toggleAllButton.id = "govuk-policy-toggle-all-btn";
  toggleAllButton.addEventListener("click", async () => {
    const previousDisabledIds = new Set(disabledStyleRuleIds);
    if (disabledStyleRuleIds.size === 0) {
      disabledStyleRuleIds = new Set(styleRules.map((rule) => rule.id));
    } else {
      disabledStyleRuleIds.clear();
    }
    updatePolicySettingsControls();
    await savePolicySettings(previousDisabledIds);
  });
  dialog.appendChild(toggleAllButton);

  const closeButton = document.createElement("button");
  closeButton.className = "govuk-button";
  closeButton.type = "button";
  closeButton.textContent = "Done";
  closeButton.addEventListener("click", () => dialog.close());
  dialog.appendChild(closeButton);

  dialog.addEventListener("close", () => {
    document.getElementById("govuk-policy-settings-btn")?.focus();
  });

  dialog.addEventListener("click", async (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    const clickedOutside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (!clickedOutside) return;

    if (await savePolicySettings(new Set(disabledStyleRuleIds))) {
      dialog.close();
    }
  });

  document.body.appendChild(dialog);
  return dialog;
}

function updatePolicySettingsControls() {
  const dialog = document.getElementById("govuk-policy-settings-dialog");
  if (!dialog) return;

  dialog.querySelectorAll("[data-policy-id]").forEach((checkbox) => {
    checkbox.checked = !disabledStyleRuleIds.has(checkbox.dataset.policyId);
  });
  const toggleAllButton = document.getElementById("govuk-policy-toggle-all-btn");
  if (toggleAllButton) {
    toggleAllButton.textContent =
      disabledStyleRuleIds.size === 0 ? "Deselect all" : "Select all";
  }
}

async function savePolicySettings(previousDisabledIds) {
  const status = document.getElementById("govuk-policy-settings-status");
  if (status) status.textContent = "";
  const dialog = document.getElementById("govuk-policy-settings-dialog");
  const controls = dialog
    ? dialog.querySelectorAll("[data-policy-id], #govuk-policy-toggle-all-btn")
    : [];
  controls.forEach((control) => {
    control.disabled = true;
  });

  try {
    await chrome.storage.local.set({
      [POLICY_SETTINGS_KEY]: [...disabledStyleRuleIds],
    });
    checkStyleViolations();
    return true;
  } catch (error) {
    disabledStyleRuleIds = new Set(previousDisabledIds);
    updatePolicySettingsControls();
    if (status) {
      status.textContent = "Could not save your policy settings. Please try again.";
    }
    console.error("GovUK style checker: could not save policy settings", error);
    return false;
  } finally {
    controls.forEach((control) => {
      control.disabled = false;
    });
  }
}

document.addEventListener("click", (event) => {
  if (event.target.closest("#govuk-policy-settings-btn")) {
    event.preventDefault();
    const dialog = ensurePolicySettingsDialog();
    updatePolicySettingsControls();
    dialog.showModal();
  }
});

document.addEventListener("change", async (event) => {
  const checkbox = event.target.closest("[data-policy-id]");
  if (!checkbox || !policySettingsLoaded) return;

  const previousDisabledIds = new Set(disabledStyleRuleIds);
  const policyId = checkbox.dataset.policyId;
  if (checkbox.checked) disabledStyleRuleIds.delete(policyId);
  else disabledStyleRuleIds.add(policyId);
  updatePolicySettingsControls();
  await savePolicySettings(previousDisabledIds);
});

async function loadPolicySettings() {
  try {
    const settings = await chrome.storage.local.get(POLICY_SETTINGS_KEY);
    const disabledIds = settings[POLICY_SETTINGS_KEY] || [];
    if (!Array.isArray(disabledIds)) {
      throw new TypeError("Saved disabled policy settings must be an array.");
    }
    const knownIds = new Set(styleRules.map((rule) => rule.id));
    disabledStyleRuleIds = new Set(
      disabledIds.filter((id) => knownIds.has(id))
    );
  } catch (error) {
    console.error("GovUK style checker: could not load policy settings", error);
  } finally {
    policySettingsLoaded = true;
    checkStyleViolations();
  }
}

loadPolicySettings();

// Reruns check on every input event - probably inefficient, could narrow this to inpput events on textareas only, or debounce?
document.addEventListener("input", (event) => {
  if (event.target.tagName.toLowerCase() === "textarea") {
    checkStyleViolations();
  }
});

// Function to display broken links in the sidebar
function displayBrokenLinksUI(brokenLinks) {
  const sidebarContainer = getSidebarContainer();
  if (!sidebarContainer) return;

  let brokenLinksDiv = document.getElementById("govuk-broken-links-reporter");
  if (!brokenLinksDiv) {
    brokenLinksDiv = document.createElement("div");
    brokenLinksDiv.id = "govuk-broken-links-reporter";
    brokenLinksDiv.style.marginTop = "15px";
    brokenLinksDiv.style.padding = "12px";
    brokenLinksDiv.style.backgroundColor = "#f8f8f8";
    brokenLinksDiv.style.fontFamily = "Arial, sans-serif";
    sidebarContainer.appendChild(brokenLinksDiv);
  }

  if (!brokenLinks || brokenLinks.length === 0) {
    brokenLinksDiv.style.display = "block";
    brokenLinksDiv.innerHTML = `
      <h2 class="govuk-heading-m">Broken links</h2>
      <p class="govuk-body">No broken links found</p>
    `;
    return;
  }

  brokenLinksDiv.style.display = "block";
  let htmlContent = `<h2 class="govuk-heading-m">Broken links found</h2>`;
  htmlContent += `<ul class="govuk-list govuk-list--bullet">`;

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
    htmlContent += `<li><span class="govuk-body">${hrefEscaped}</span> <span class="govuk-body-s">(${link.status})</span> <a href="#" class="govuk-link govuk-broken-link-jump" data-link-id="${id}">Jump</a></li>`;
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
