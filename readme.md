# What does this extension do?

The GOV.UK Style Checker:

- checks content in GOV.UK Publisher against GOV.UK style and accessibility rules and guidelines
- checks for any broken links (i.e. links that don't return a 2XX response code)

The style checker is a Chrome extension. It isn't signed, or available on the Chrome Web Store.

It automatically triggers on any "edit" page in GOV.UK Publisher, and displays any issues it finds in the right-hand sidepanel.

It currently only runs on pages that have been ported to the GOV.UK Design System. Backwards compatibility with the old GOV.UK Frontend is planned for a future release.

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

## Todo

- [ ] Convert to the design system
- [ ] Ensure accessibility compliance
- [ ] Add an on/off toggle
- [x] Add 16 high-priority policies for MVP
- [ ] Ensure extension works on all GOV.UK Publisher pages, including old GOV.UK Frontend
- [ ] Add a "Give feedback or report a bug" link - make this a Google/Microsoft form
- [x] Split out policies into their own file
- [ ] Write or generate short titles for each policy
- [ ] Write docs and installation instructions
- [ ] Change url scopes so extension only runs and injects on Publisher pages
