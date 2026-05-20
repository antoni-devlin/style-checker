// Define the 10 style rules from the GOV.UK style guide
const styleRules = [
  {
    name: "Full stops used in abbreviations (e.g., B.B.C.)",
    regex: /\b[A-Z]\.[A-Z]\.(?:[A-Z]\.)*\b/,
  },
  {
    name: "Decimals used in a whole currency amount (e.g., £75.00)",
    regex: /£\d+\.00\b/,
  },
  {
    name: "Hyphens used in a sort code (use spaces instead)",
    regex: /\b\d{2}-\d{2}-\d{2}\b/,
  },
  {
    name: "Used 'click' instead of 'select' for a UI element instruction",
    regex: /\bclick\s+(?:on\s+)?(?:the\s+)?['"]?[A-Z][A-Za-z\s]+['"]?\b/i,
  },
  {
    name: "Banned negative contraction used (e.g., can't, don't)",
    regex: /\b(can't|don't|won't|shouldn't|couldn't|wouldn't)\b/i,
  },
  {
    name: "Slash used instead of 'or' (e.g., he/she, 3/4)",
    regex: /\b\w+\/\w+\b/,
  },
  {
    name: "Hyphenated 'A-level' (should be lower case 'A level')",
    regex: /\bA-level\b/i,
  },
  {
    name: "Apostrophe used incorrectly to pluralize an acronym/qualification (e.g., GCSE's)",
    regex: /\b(GCSE|A\*|SME|URL)('s)\b/,
  },
  {
    name: "Hyphen used in a date or time range (use the word 'to')",
    regex: /\b(\d+(?:am|pm)?)\s*[-–—]\s*(\d+(?:am|pm)?)\b/,
  },
  {
    name: "Banned word filler 'in order to' used",
    regex: /\bin\s+order\s+to\b/i,
  },
];

// Global map of violation occurrences so sidebar links can reference them
window.__govukStyleViolations = window.__govukStyleViolations || {};

// Function to update the sidebar UI with found violations
function updateSidebarUI(foundViolations) {
  // Find the user's existing sidebar container (looks for class or ID)
  const sidebarContainer = document.querySelector(
    ".sidebar-components, #sidebar-components"
  );

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
    // Clean styling matching official red warning accents
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
  reportDiv.innerHTML = htmlContent;

  // Ensure accordion section containing an element is open (returns when open or timeout)
  function openAccordionForElement(el) {
    return new Promise((resolve) => {
      if (!el || !el.closest) return resolve();
      const content =
        el.closest(".govuk-accordion__section-content") ||
        el.closest("details");
      if (!content) return resolve();

      const isOpen =
        !(content.hasAttribute && content.hasAttribute("hidden")) &&
        !content.hidden;
      if (isOpen) return resolve();

      // find toggle button that controls this content
      const toggle =
        (content.id &&
          document.querySelector(`[aria-controls="${content.id}"]`)) ||
        (content.parentElement &&
          content.parentElement.querySelector(
            ".govuk-accordion__section-button"
          )) ||
        null;

      if (!toggle) {
        // try setting open on details
        try {
          if (content.tagName && content.tagName.toLowerCase() === "details") {
            content.open = true;
          }
        } catch (e) {}
        return resolve();
      }

      // Wait for the toggle/content to reflect open state, or timeout
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
        // only click if it appears closed
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
