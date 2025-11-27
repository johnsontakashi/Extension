# Auto Refresh & Task Notifier Chrome Extension

A Chrome extension that automatically refreshes the first pinned tab every 5 minutes and performs automated actions to collect and notify about tasks that don't contain "Contacted" text.

## Features

- **Automatic Refresh**: Refreshes the first pinned tab every 5 minutes
- **Automated Page Navigation**: Clicks "Saved searches" and selects "PH" option
- **Smart Task Detection**: Collects task titles that don't contain "Contacted" 
- **Chrome Notifications**: Displays notifications for new tasks only (avoids duplicates)
- **User Interface**: Optional popup interface for monitoring and control
- **Error Handling**: Robust retry logic and error handling for dynamic content

## Installation Instructions

### Method 1: Manual Installation (Recommended for Development)

1. **Download/Clone the Extension Files**
   - Download all the extension files to a folder on your computer
   - Ensure you have all these files in the same directory:
     - `manifest.json`
     - `background.js`
     - `content.js`
     - `popup.html`
     - `popup.js`

2. **Add Icon Files (Optional)**
   - Create simple icon files or download icons:
     - `icon16.png` (16x16 pixels)
     - `icon48.png` (48x48 pixels) 
     - `icon128.png` (128x128 pixels)
   - Or remove the icons section from `manifest.json` if you don't want icons

3. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Go to `chrome://extensions/`
   - OR: Menu (⋮) → More tools → Extensions

4. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

5. **Load the Extension**
   - Click "Load unpacked" button
   - Select the folder containing your extension files
   - The extension should appear in your extensions list

6. **Verify Installation**
   - Look for "Auto Refresh & Task Notifier" in your extensions
   - Check that it's enabled (toggle should be blue/on)
   - You should see the extension icon in your Chrome toolbar

## Setup and Configuration

### 1. Pin Your Target Tab
- Navigate to the website you want to monitor
- Right-click on the tab
- Select "Pin tab" from the context menu
- **Important**: The extension only monitors the FIRST pinned tab

### 2. Grant Permissions
- The extension will request permissions for:
  - Access to all websites (to work on any domain)
  - Notifications (to alert you about new tasks)
  - Tab management (to refresh and inject scripts)

### 3. Test the Extension
- Open the extension popup by clicking its icon
- Click "Test Notification" to verify notifications work
- Click "Refresh Now" to manually trigger a refresh cycle

## How It Works

1. **Automatic Refresh Cycle** (Every 5 Minutes)
   - Finds the first pinned tab
   - Refreshes the tab using `chrome.tabs.reload()`
   - Waits 2 seconds for page load
   - Injects the content script

2. **Automated Page Navigation**
   - Content script looks for "Saved searches" element
   - Clicks the element using multiple fallback methods
   - Waits for dropdown/options to appear
   - Finds and clicks "PH" option
   - Waits for task list to load

3. **Task Collection**
   - Uses MutationObserver to wait for dynamic content
   - Scans page for task elements using multiple selectors
   - Filters out tasks containing "Contacted" text
   - Cleans and validates task titles
   - Sends valid tasks to background script

4. **Notification Management**
   - Background script receives task list from content script
   - Compares against previously notified tasks (stored locally)
   - Shows Chrome notifications only for new tasks
   - Stores notified tasks to prevent duplicates

## Usage

### Automatic Operation
- Once installed and set up, the extension runs automatically
- No user intervention required
- Refreshes first pinned tab every 5 minutes
- Sends notifications when new tasks are found

### Manual Controls (via Popup)
- **Refresh Now**: Triggers immediate refresh cycle
- **Test Notification**: Sends a test notification  
- **Clear History**: Clears notification history (allows re-notification of all tasks)

### Monitoring
The popup interface shows:
- Extension status (Active/Inactive)
- Number of pinned tabs
- Last check time
- Total tasks found
- Recent task list (last 24 hours)

## Troubleshooting

### Common Issues

**Extension not working:**
- Ensure you have at least one pinned tab
- Check that the extension is enabled in Chrome settings
- Verify notifications are allowed for Chrome

**Tasks not being detected:**
- Check browser console for error messages (F12 → Console)
- Verify the target website structure hasn't changed
- The content script uses multiple fallback selectors for robustness

**Notifications not appearing:**
- Check Chrome notification settings
- Ensure "Notifications" permission is granted
- Test notifications using the popup interface

**Permission errors:**
- Remove and reinstall the extension
- Ensure "Developer mode" is enabled
- Check that host_permissions includes the target domain

### Debug Information

**View Console Logs:**
- Open Developer Tools (F12)
- Check Console tab for debug messages
- Both background script and content script log their activities

**Check Extension Logs:**
- Go to `chrome://extensions/`
- Click "Inspect views: service worker" under your extension
- View console for background script logs

## Technical Details

### Files Overview
- **manifest.json**: Extension configuration and permissions
- **background.js**: Service worker handling refresh timing and notifications
- **content.js**: Injected script for page automation and task collection  
- **popup.html/js**: User interface for monitoring and manual controls

### Key Technologies
- **Manifest V3**: Latest Chrome extension format
- **Service Workers**: For background processing
- **Content Scripts**: For page manipulation
- **MutationObserver**: For waiting on dynamic content
- **Chrome APIs**: tabs, scripting, notifications, storage

### Permissions Required
- `tabs`: Access to tab information and refresh
- `scripting`: Inject content scripts
- `notifications`: Show Chrome notifications
- `activeTab`: Access active tab content
- `storage`: Store notification history
- `<all_urls>`: Work on any website

## Customization

### Modify Timing
Change refresh interval in `background.js`:
```javascript
// Change 300000 (5 minutes) to desired milliseconds
refreshInterval = setInterval(async () => {
  await refreshFirstPinnedTab();
}, 300000);
```

### Customize Text Matching
Modify search terms in `content.js`:
```javascript
const CONFIG = {
  savedSearchesText: 'Saved searches',  // Change this
  phOptionText: 'PH',                   // Change this  
  contactedText: 'Contacted'            // Change this
};
```

### Add Domain Restrictions
Modify `manifest.json` to limit to specific domains:
```json
"host_permissions": [
  "https://yourdomain.com/*"
]
```

## Security Notes

- Extension uses minimal permissions required for functionality
- No external network requests (except Chrome APIs)
- All data stored locally in Chrome storage
- Content script only activates on refresh cycles
- No persistent background processes when not in use

## Support

For issues, questions, or contributions:
1. Check the browser console for error messages
2. Verify all files are present and properly named
3. Ensure target website structure matches expected elements
4. Test with different websites to isolate issues

## Version History

**v1.0**
- Initial release
- Automatic 5-minute refresh cycle
- Task detection and notification
- Popup interface for monitoring
- Duplicate notification prevention