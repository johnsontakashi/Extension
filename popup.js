// Popup script for Auto Refresh & Task Notifier Extension

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  
  // Initialize popup
  await updateStatus();
  await loadRecentTasks();
  
  // Set up event listeners
  setupEventListeners();
  
  // Update status every 5 seconds while popup is open
  const statusInterval = setInterval(updateStatus, 5000);
  
  // Clean up on popup close
  window.addEventListener('beforeunload', () => {
    clearInterval(statusInterval);
  });
});

// Set up event listeners
function setupEventListeners() {
  // Refresh Now button
  document.getElementById('refreshNow').addEventListener('click', async () => {
    const button = document.getElementById('refreshNow');
    const originalText = button.textContent;
    
    button.textContent = 'Refreshing...';
    button.disabled = true;
    
    try {
      // Trigger immediate refresh
      await chrome.runtime.sendMessage({ type: 'TRIGGER_REFRESH' });
      
      // Update status after a brief delay
      setTimeout(async () => {
        await updateStatus();
        button.textContent = 'Refreshed!';
        
        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
        }, 1500);
      }, 2000);
      
    } catch (error) {
      console.error('Error triggering refresh:', error);
      button.textContent = 'Error';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1500);
    }
  });
  
  // Test Notification button
  document.getElementById('testNotification').addEventListener('click', async () => {
    const button = document.getElementById('testNotification');
    const originalText = button.textContent;
    
    button.textContent = 'Sending...';
    button.disabled = true;
    
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Test Notification',
        message: 'This is a test notification from Auto Refresh & Task Notifier extension.'
      });
      
      button.textContent = 'Sent!';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1500);
      
    } catch (error) {
      console.error('Error sending test notification:', error);
      button.textContent = 'Error';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1500);
    }
  });
  
  // Clear History button
  document.getElementById('clearHistory').addEventListener('click', async () => {
    const button = document.getElementById('clearHistory');
    const originalText = button.textContent;
    
    if (!confirm('Are you sure you want to clear the notification history? This will allow previously notified tasks to be notified again.')) {
      return;
    }
    
    button.textContent = 'Clearing...';
    button.disabled = true;
    
    try {
      await chrome.storage.local.clear();
      await loadRecentTasks();
      
      button.textContent = 'Cleared!';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1500);
      
    } catch (error) {
      console.error('Error clearing history:', error);
      button.textContent = 'Error';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1500);
    }
  });
}

// Update status information
async function updateStatus() {
  try {
    // Update pinned tabs count
    const tabs = await chrome.tabs.query({});
    const pinnedTabs = tabs.filter(tab => tab.pinned);
    document.getElementById('pinnedTabsCount').textContent = pinnedTabs.length;
    
    // Update extension status
    const extensionStatusEl = document.getElementById('extensionStatus');
    if (pinnedTabs.length > 0) {
      extensionStatusEl.textContent = 'Active';
      extensionStatusEl.className = 'status-value';
    } else {
      extensionStatusEl.textContent = 'No Pinned Tabs';
      extensionStatusEl.className = 'status-value warning';
    }
    
    // Update last check time (stored in background script)
    const result = await chrome.storage.local.get('lastCheck');
    const lastCheckEl = document.getElementById('lastCheck');
    if (result.lastCheck) {
      const lastCheck = new Date(result.lastCheck);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastCheck) / (1000 * 60));
      
      if (diffMinutes < 1) {
        lastCheckEl.textContent = 'Just now';
      } else if (diffMinutes < 60) {
        lastCheckEl.textContent = `${diffMinutes}m ago`;
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        lastCheckEl.textContent = `${diffHours}h ago`;
      }
    } else {
      lastCheckEl.textContent = 'Never';
    }
    
    // Update tasks found count
    const notifiedTitles = await chrome.storage.local.get('notifiedTitles');
    const tasksCount = notifiedTitles.notifiedTitles ? notifiedTitles.notifiedTitles.length : 0;
    document.getElementById('tasksFound').textContent = tasksCount;
    
  } catch (error) {
    console.error('Error updating status:', error);
  }
}

// Load and display recent tasks
async function loadRecentTasks() {
  try {
    const result = await chrome.storage.local.get(['notifiedTitles', 'taskHistory']);
    const taskListEl = document.getElementById('taskList');
    
    let tasks = [];
    
    // Get notified titles
    if (result.notifiedTitles && Array.isArray(result.notifiedTitles)) {
      tasks = result.notifiedTitles.map(title => ({
        title: title,
        timestamp: Date.now() // We don't have timestamps for existing tasks
      }));
    }
    
    // Get task history with timestamps if available
    if (result.taskHistory && Array.isArray(result.taskHistory)) {
      tasks = result.taskHistory;
    }
    
    // Sort by timestamp (most recent first)
    tasks.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Filter to last 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentTasks = tasks.filter(task => (task.timestamp || 0) > oneDayAgo);
    
    // Display tasks
    if (recentTasks.length === 0) {
      taskListEl.innerHTML = '<div class="no-tasks">No tasks found yet</div>';
    } else {
      taskListEl.innerHTML = recentTasks.slice(0, 10).map(task => {
        const timeStr = task.timestamp ? formatTime(new Date(task.timestamp)) : 'Unknown time';
        return `
          <div class="task-item">
            <div style="font-weight: 500; color: #495057; margin-bottom: 2px;">${escapeHtml(task.title)}</div>
            <div style="font-size: 11px; color: #adb5bd;">${timeStr}</div>
          </div>
        `;
      }).join('');
    }
    
  } catch (error) {
    console.error('Error loading recent tasks:', error);
    document.getElementById('taskList').innerHTML = '<div class="no-tasks">Error loading tasks</div>';
  }
}

// Format time for display
function formatTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TASK_UPDATE') {
    loadRecentTasks();
    updateStatus();
  }
});