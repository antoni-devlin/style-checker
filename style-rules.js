// Style rule definitions are kept in a separate content script for easier maintenance and version control.
const styleRules = [
  { name: "Link text too short", description: "Link text should be more than one word", regex: /\[([^\s\]]+)\]\(([^)]+)\)/ },
  { name: "H1 in body content", description: "There should be no H1s in body content", regex: /^#(?!#)\s*(.+)$/ },
  { name: "Bold text", description: "There should be no bold text", regex: /(\*\*|__)(.*?)\1/ },
  {
    name: "Consecutive headers of the same level",
    description: "There shouldn't be two headings of the same level in a row without any content in between",
    regex: /^(#{1,6})(.*)$\s+^\1(.*)$/,
  },
  {
    name: "Long table",
    description: "Tables shouldn't be too long if you can avoid it.",
    regex:
      /(?:^(?:\|[^|\r\n]*){6,}\|[\r\n]+^\|[\s|:-]+\|[\r\n]+(?:^\|[^\r\n]+\|(?:[\r\n]+|$))+)|(?:^\|[^\r\n]+\|[\r\n]+^\|[\s|:-]+\|[\r\n]+(?:^\|[^\r\n]+\|[\r\n]+){11,}(?:^\|[^\r\n]+\|(?:[\r\n]+|$))*)/,
  },
  {
    name: "Tables missing row/column headers",
    description: "Tables need to have row and column headers",
    regex: /^(?:\|[^\r\n]+\|[\r\n]*){2,}/,
  },
  {
    name: "No FAQs",
    description: "Don't use FAQs or frequently asked questions in content.",
    regex: /\b(FAQ|Frequently Asked Question)s?\b/i,
  },
  {
    name: "Anchor links",
    description: "Don't use anchor link in content",
    regex: /\[([^\]]+)\]\((?:https?:\/\/[^\s)]+)?#[^)]+\)/,
  },
  {
    name: "Short table",
    description: "Tables shouldn't be too short - consider whether a short table could be better presented as a list.",
    regex:
      /^(?:\|[^|\r\n]+\|[\r\n]+)(?:\|[\s:-]+\|[\r\n]+)(?:\|[^|\r\n]+\|(?:[\r\n]+|$)){1,2}/,
  },
  {
    name: "Acronyms",
    description: "Acronyms should be defined at first use, and abbreviations should not have periods",
    regex:
      /\b(?!(?:UK|DVLA|USA|EU|VAT|MP|HMRC|MOT|NHS|PIN|DNA)\b)(?<!\([^\)]*?)(?:[A-Z]{2,6}|[A-Z](?:\.[A-Z])+\.?)\b(?!\s*\([^)]*\))(?![^()]*\))/,
      
  },
  {
    // TODO: Look into using the compromise library for this instead of regex
    name: "Passive voice",
    description: "Content should be written in the active voice",
    regex:
      /\b(am|are|is|was|were|be|been|being|get|gets|got|gotten|getting)\b(?:\s+(?:[a-z]+ly|just|already|not|never|also|even|often|still|always|soon))*\s+(\w+ed|\w+en|built|caught|drawn|found|held|kept|left|lost|made|paid|run|said|seen|sent|sold|spent|taken|taught|told|thought|understood|won|written)\b/i,
  },
  {
    name: "List without lead-in line",
    description: "Bullet lists should start with a lead-in line",
    regex: /(^\s*$[\r\n]+)^\s*[*+-]\s+.+$/,
  },
  {
    name: "Negative contractions",
    description: "Do not use negative contractions",
    regex: /\b\w+n't\b/,
  },
  {
    name: "Use of eg, etc, ie",
    description: "Don't use abbreviations such as e.g., i.e., etc. in content",
    regex: /\b(?:e\.?g\.?|i\.?e\.?|etc\.?)\b/,
  },
  {
    name: "full_date",
    description: "Dates should be written with a 1- or 2-digit day, the full or abbreviated month name, and a 4-digit year separated by spaces (e.g., 5 May 2024 or 23 September 2021).",
    regex: /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/
  },
  {
    name: "tax_year_range",
    description: "Dates should be written as 'tax year' followed by two 4-digit years separated by 'to' (e.g., tax year 2022 to 2023).",
    regex: /\btax\s+year\s+\d{4}\s+to\s+\d{4}\b/
  },
  {
    name: "weekly_operating_hours",
    description: "Dates and times should be written with a day-of-the-week range, followed by a comma, and a 12-hour am/pm time range separated by 'to' (e.g., Monday to Friday, 9am to 5pm).",
    regex: /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+to\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\d{1,2}(?:am|pm)\s+to\s+\d{1,2}(?:am|pm)\b/
  },
  {
    name: "date_to_date_range",
    description: "Dates should be written as a day and full or abbreviated month, separated by 'to' from another day and month, without years (e.g., 1 June to 31 August or 5 Apr to 6 Apr).",
    regex: /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+to\s+\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/
  },
  {
    name: "month_to_month_range_with_year",
    description: "Dates should be written as two 3-letter month abbreviations separated by 'to', followed by a 4-digit year (e.g., Apr to Jun 2023).",
    regex: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+to\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/
  },
  {
    name: "legacy_parenthesized_date",
    description: "Dates should be written as the specific historical date '14 June 2012' enclosed in parentheses.",
    regex: /\(14\s+June\s+2012\)/
  },
];
