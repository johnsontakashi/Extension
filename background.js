// Background service worker for Auto Refresh & Task Notifier Extension

let refreshInterval;
let notifiedTitles = new Set();

// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Auto Refresh & Task Notifier Extension installed');
  startAutoRefresh();
  loadNotifiedTitles();
});

// Start auto-refresh on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup detected');
  startAutoRefresh();
  loadNotifiedTitles();
});

// Load previously notified titles from storage
async function loadNotifiedTitles() {
  try {
    const result = await chrome.storage.local.get('notifiedTitles');
    if (result.notifiedTitles) {
      notifiedTitles = new Set(result.notifiedTitles);
      console.log('Loaded notified titles:', notifiedTitles.size, 'items');
    }
  } catch (error) {
    console.error('Error loading notified titles:', error);
  }
}

// Save notified titles to storage
async function saveNotifiedTitles() {
  try {
    await chrome.storage.local.set({
      notifiedTitles: Array.from(notifiedTitles)
    });
    console.log('Saved notified titles:', notifiedTitles.size, 'items');
  } catch (error) {
    console.error('Error saving notified titles:', error);
  }
}

// Start the auto-refresh mechanism
function startAutoRefresh() {
  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Set up 5-minute refresh interval (300,000ms)
  refreshInterval = setInterval(async () => {
    await refreshFirstPinnedTab();
  }, 300000); // 5 minutes
  
  console.log('Auto-refresh started: every 5 minutes');
  
  // Also refresh immediately on start
  refreshFirstPinnedTab();
}

// Find and refresh the first pinned tab
async function refreshFirstPinnedTab() {
  try {
    // Query all tabs to find pinned ones
    const tabs = await chrome.tabs.query({});
    const pinnedTabs = tabs.filter(tab => tab.pinned);
    
    if (pinnedTabs.length === 0) {
      console.log('No pinned tabs found');
      return;
    }
    
    // Get the first pinned tab
    const firstPinnedTab = pinnedTabs[0];
    console.log('Refreshing first pinned tab:', firstPinnedTab.url);
    
    // Reload the tab
    await chrome.tabs.reload(firstPinnedTab.id);
    
    // Wait a moment for the page to start loading, then inject content script
    setTimeout(async () => {
      await injectContentScript(firstPinnedTab.id);
    }, 2000);
    
  } catch (error) {
    console.error('Error refreshing pinned tab:', error);
  }
}

// Inject content script into the tab
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    console.log('Content script injected successfully');
  } catch (error) {
    console.error('Error injecting content script:', error);
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TASK_TITLES_FOUND') {
    handleTaskTitles(message.titles);
    sendResponse({ success: true });
  } else if (message.type === 'CONTENT_SCRIPT_ERROR') {
    console.error('Content script error:', message.error);
    sendResponse({ success: false });
  }
});

// Handle task titles received from content script
async function handleTaskTitles(titles) {
  console.log('Received task titles:', titles);
  
  if (!titles || titles.length === 0) {
    console.log('No new tasks to notify about');
    return;
  }
  
  // Filter out already notified titles
  const newTitles = titles.filter(title => !notifiedTitles.has(title));
  
  if (newTitles.length === 0) {
    console.log('All titles already notified');
    return;
  }
  
  // Add new titles to notified set
  newTitles.forEach(title => notifiedTitles.add(title));
  
  // Save updated notified titles
  await saveNotifiedTitles();
  
  // Create notifications for new titles
  await createNotifications(newTitles);
}

// Create Chrome notifications
async function createNotifications(titles) {
  try {
    if (titles.length === 1) {
      // Single notification for one title
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'New Task Found',
        message: titles[0]
      });
    } else {
      // List notification for multiple titles
      const items = titles.slice(0, 5).map(title => ({
        title: '• ' + title,
        message: ''
      }));
      
      await chrome.notifications.create({
        type: 'list',
        iconUrl: 'icon48.png',
        title: `${titles.length} New Tasks Found`,
        message: 'Tasks without "Contacted" text:',
        items: items
      });
      
      // If more than 5 items, create additional notifications
      if (titles.length > 5) {
        const remaining = titles.slice(5);
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: `${remaining.length} More Tasks`,
          message: `And ${remaining.length} more tasks found...`
        });
      }
    }
    
    console.log('Notifications created for', titles.length, 'new titles');
  } catch (error) {
    console.error('Error creating notifications:', error);
  }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);
  // Clear the notification
  chrome.notifications.clear(notificationId);
});

// Clear old notifications periodically (cleanup)
setInterval(() => {
  chrome.notifications.getAll((notifications) => {
    Object.keys(notifications).forEach(id => {
      chrome.notifications.clear(id);
    });
  });
}, 3600000); // Clear every hour