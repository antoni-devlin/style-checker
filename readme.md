# What does this extension do?

The GOV.UK Style Checker:

- checks content in GOV.UK Publisher against GOV.UK style and accessibility rules and guidelines
- checks for any broken links (i.e. links that don't return a 2XX response code)

The style checker is a Chrome extension. It isn't signed, or available on the Chrome Web Store.

It automatically triggers on any "edit" page in GOV.UK Publisher, and displays any issues it finds in the right-hand sidepanel.

It currently only runs on pages that have been ported to the GOV.UK Design System. Backwards compatibility with the old GOV.UK Frontend is planned for a future release.

## How it works

When you visit an "edit" page in Mainstream publisher, the extension will check any content in a `textarea` element (a textbox meant for longform text, so not, for example, titles). It will loop through all of the policies it knows about from the `style-rules.js` file, and alter you in the sidebar of publisher if it finds any issues.

It does this as soon as the page loads, and also whenever any content is changed so it will continue checking your work as you make changes in publisher - you do not need to reload the page.

### Checking broken links

If you click on the "Check broken links" button, it will go through the same content, identify anything that looks like a full url (i.e. beginning with http), and test them to see if they seem broken. It will list any suspected broken links it finds in the sidebar.

# Installation

Before you installing, you need to check that you have:

- the Chrome browser installed
- permission to install unsigned extensions [also called installing unpacked extensions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

1. Go to the page for the [latest release of the style checker](https://github.com/antoni-devlin/style-checker/releases/).
2. Download the zip file under the latest release called "chrome-extension.zip"
3. Unzip the file on your computer
4. In Chrome, type `chrome://extensions/` into the address bar
5. Enable "Developer mode" in the top right corner - you'll only have to do this once
6. Click "Load unpacked" and select the folder where you unzipped the extension

You'll have to follow these instructions every time you want to update the extension to a new version.

# Security and data protection

## Scope

In `manifest.json`, the extension is scoped to only activate and run on URLs beginning with `https://publisher.publishing.service.gov.uk/`.

## Permissions

The extension currently requests `activeTab` and `scripting` permissions so it can inspect the current page and run checks when the user activates it on a supported Publisher page. These permissions are limited to the active tab and are used only for the extension's in-browser checks.

## Data storage

The extension runs locally in the browser and does not persist user data to disk or store it in a database. It does not collect personal or sensitive data, and it does not handle file uploads or other input beyond the content already visible on the page.

The extension has access to and processes on-page content (currently only in `textarea` elements).

Style policies are checked against hardcoded regex policies in `style-rules.js`.

## Network access

The only network activity is checking for broken links, and only when the "Check for broken links" button is pressed.

`background.js` makes a HEAD request to every link identified in a textarea on the current page. If the HEAD request fails, it retries with a GET request. The extension only parses the response code and does not fetch or store the linked content. To get around CORS restrictions, this had to be separate from the main `content.js` script.

# What policies are currently supported?

As this is an MVP, the list of things it checks for is limited. It can currently check the following:

- Broken links
- Link text that is only one word
- Heading level 1s in body content
- Bold text in content
- Consecutive headings of the same level
- Long tables
- Tables without row or column headers
- FAQs
- Plain and simple English
- Anchor links
- Tables that are too short or have too few rows and columns
- Acronyms and abbreviations that are not defined on first use, or abbreviations without periods
- Passive voice
- Bullet lists without a lead-in line
- Negative contractions
- Abbreviations such as “eg”, “etc”, and “ie”
- Dates

# Todo

- [ ] Test mvp policy regexes to ensure they're working as intended
- [ ] Convert to the design system
- [ ] Ensure accessibility compliance
- [ ] Add an on/off toggle
- [x] Add 16 high-priority policies for MVP
- [ ] Ensure extension works on all GOV.UK Publisher pages, including old GOV.UK Frontend
- [ ] Add a "Give feedback or report a bug" link - make this a Google/Microsoft form
- [x] Split out policies into their own file
- [ ] Write or generate short titles for each policy
- [ ] Write docs and installation instructions
- [x] Change url scopes so extension only runs and injects on Publisher pages
- [ ] Write unit tests for every policy