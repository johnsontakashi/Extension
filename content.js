// Content script for Auto Refresh & Task Notifier Extension

(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    maxRetries: 10,
    retryDelay: 1000, // 1 second
    elementWaitTimeout: 30000, // 30 seconds
    savedSearchesText: 'Saved searches',
    phOptionText: 'PH',
    contactedText: 'Contacted'
  };
  
  // State tracking
  let isProcessing = false;
  let retryCount = 0;
  
  console.log('Auto Refresh & Task Notifier content script loaded');
  
  // Start the automation process
  function startAutomation() {
    if (isProcessing) {
      console.log('Automation already in progress, skipping...');
      return;
    }
    
    isProcessing = true;
    retryCount = 0;
    
    console.log('Starting automation process...');
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', executeAutomation);
    } else {
      setTimeout(executeAutomation, 2000); // Wait 2 seconds for dynamic content
    }
  }
  
  // Main automation execution
  async function executeAutomation() {
    try {
      console.log('Executing automation steps...');
      
      // Step 1: Click "Saved searches"
      const savedSearchesClicked = await clickSavedSearches();
      if (!savedSearchesClicked) {
        throw new Error('Failed to click Saved searches');
      }
      
      // Step 2: Select "PH" option
      const phSelected = await selectPHOption();
      if (!phSelected) {
        throw new Error('Failed to select PH option');
      }
      
      // Step 3: Wait for task list to load and collect titles
      const taskTitles = await collectTaskTitles();
      
      // Step 4: Send results to background script
      await sendTaskTitles(taskTitles);
      
      console.log('Automation completed successfully');
      
    } catch (error) {
      console.error('Automation error:', error);
      
      // Retry logic
      if (retryCount < CONFIG.maxRetries) {
        retryCount++;
        console.log(`Retrying automation (attempt ${retryCount}/${CONFIG.maxRetries})...`);
        setTimeout(executeAutomation, CONFIG.retryDelay * retryCount);
      } else {
        console.error('Max retries reached, automation failed');
        sendErrorToBackground(error.message);
      }
    } finally {
      if (retryCount >= CONFIG.maxRetries || retryCount === 0) {
        isProcessing = false;
      }
    }
  }
  
  // Click the "Saved searches" element
  async function clickSavedSearches() {
    console.log('Looking for "Saved searches" element...');
    
    const selectors = [
      `[aria-label*="${CONFIG.savedSearchesText}"]`,
      `[title*="${CONFIG.savedSearchesText}"]`,
      `*:contains("${CONFIG.savedSearchesText}")`,
      `a[href*="saved"], button[title*="saved"], .saved-searches`,
      `span:contains("${CONFIG.savedSearchesText}")`,
      `div:contains("${CONFIG.savedSearchesText}")`,
      `li:contains("${CONFIG.savedSearchesText}")`
    ];
    
    for (const selector of selectors) {
      try {
        let element;
        
        if (selector.includes(':contains')) {
          // Custom :contains selector implementation
          element = findElementByText(CONFIG.savedSearchesText);
        } else {
          element = await waitForElement(selector);
        }
        
        if (element && isElementClickable(element)) {
          console.log('Found "Saved searches" element:', element);
          clickElement(element);
          await sleep(1500); // Wait for response
          return true;
        }
      } catch (error) {
        console.log(`Selector "${selector}" failed:`, error.message);
      }
    }
    
    console.error('Could not find "Saved searches" element');
    return false;
  }
  
  // Select the "PH" option
  async function selectPHOption() {
    console.log('Looking for "PH" option...');
    
    // Wait a bit for the dropdown/options to appear
    await sleep(2000);
    
    const selectors = [
      `[aria-label*="${CONFIG.phOptionText}"]`,
      `[title*="${CONFIG.phOptionText}"]`,
      `option[value*="PH"], option:contains("${CONFIG.phOptionText}")`,
      `li:contains("${CONFIG.phOptionText}")`,
      `div:contains("${CONFIG.phOptionText}")`,
      `span:contains("${CONFIG.phOptionText}")`,
      `a[href*="PH"], button:contains("${CONFIG.phOptionText}")`
    ];
    
    for (const selector of selectors) {
      try {
        let element;
        
        if (selector.includes(':contains')) {
          element = findElementByText(CONFIG.phOptionText, ['li', 'div', 'span', 'button', 'a', 'option']);
        } else {
          element = await waitForElement(selector);
        }
        
        if (element && isElementClickable(element)) {
          console.log('Found "PH" option element:', element);
          clickElement(element);
          await sleep(2000); // Wait for task list to load
          return true;
        }
      } catch (error) {
        console.log(`Selector "${selector}" failed:`, error.message);
      }
    }
    
    console.error('Could not find "PH" option');
    return false;
  }
  
  // Collect task titles that don't contain "Contacted"
  async function collectTaskTitles() {
    console.log('Collecting task titles...');
    
    // Wait for task list to load
    await waitForTaskList();
    
    const titles = [];
    const taskSelectors = [
      '.task-item', '.task', '.item', '.row',
      '[data-task]', '[data-item]', '[class*="task"]',
      'tr', 'li', '.list-item', '.entry'
    ];
    
    let taskElements = [];
    
    // Try different selectors to find task elements
    for (const selector of taskSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        taskElements = Array.from(elements);
        break;
      }
    }
    
    if (taskElements.length === 0) {
      console.log('No task elements found, trying fallback methods...');
      // Fallback: look for any text elements that might be tasks
      taskElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.trim();
        return text && text.length > 10 && text.length < 200 && 
               !el.querySelector('*') && // No child elements
               el.offsetParent !== null; // Element is visible
      });
    }
    
    console.log(`Processing ${taskElements.length} potential task elements...`);
    
    // Process each task element
    taskElements.forEach((element, index) => {
      try {
        const text = element.textContent?.trim();
        if (!text || text.length < 3) return;
        
        // Check if this looks like a task title
        if (isLikelyTaskTitle(text)) {
          // Check if it contains "Contacted"
          if (!text.toLowerCase().includes(CONFIG.contactedText.toLowerCase())) {
            // Extract the main title (remove extra text/metadata)
            const cleanTitle = cleanTaskTitle(text);
            if (cleanTitle && !titles.includes(cleanTitle)) {
              titles.push(cleanTitle);
              console.log(`Task ${index + 1}: "${cleanTitle}"`);
            }
          } else {
            console.log(`Skipping contacted task: "${text.substring(0, 50)}..."`);
          }
        }
      } catch (error) {
        console.error(`Error processing task element ${index}:`, error);
      }
    });
    
    console.log(`Found ${titles.length} tasks without "Contacted"`);
    return titles;
  }
  
  // Wait for task list to load using MutationObserver
  async function waitForTaskList() {
    return new Promise((resolve) => {
      console.log('Waiting for task list to load...');
      
      const timeout = setTimeout(() => {
        console.log('Task list wait timeout reached');
        resolve();
      }, CONFIG.elementWaitTimeout);
      
      // Watch for DOM changes
      const observer = new MutationObserver((mutations) => {
        let foundTasks = false;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Check if any task-like elements were added
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === 1 && // Element node
                  (node.textContent?.length > 20 || node.querySelectorAll('*').length > 2)) {
                foundTasks = true;
              }
            });
          }
        });
        
        if (foundTasks) {
          console.log('Task list changes detected');
          clearTimeout(timeout);
          observer.disconnect();
          setTimeout(resolve, 1000); // Wait a bit more for all content to load
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Also resolve if tasks are already present
      setTimeout(() => {
        const taskSelectors = ['.task', '.item', 'tr', 'li'];
        for (const selector of taskSelectors) {
          if (document.querySelectorAll(selector).length > 0) {
            console.log('Tasks already present');
            clearTimeout(timeout);
            observer.disconnect();
            resolve();
            return;
          }
        }
      }, 2000);
    });
  }
  
  // Helper function to find element by text content
  function findElementByText(text, tagNames = ['*']) {
    for (const tagName of tagNames) {
      const elements = document.querySelectorAll(tagName);
      for (const element of elements) {
        if (element.textContent?.toLowerCase().includes(text.toLowerCase())) {
          return element;
        }
      }
    }
    return null;
  }
  
  // Wait for element with timeout and retry
  async function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }
  
  // Check if element is clickable
  function isElementClickable(element) {
    const style = window.getComputedStyle(element);
    return element.offsetParent !== null && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           style.pointerEvents !== 'none';
  }
  
  // Click element with different methods
  function clickElement(element) {
    try {
      // Try multiple click methods
      element.click();
    } catch (error1) {
      try {
        element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      } catch (error2) {
        try {
          const event = document.createEvent('MouseEvents');
          event.initEvent('click', true, true);
          element.dispatchEvent(event);
        } catch (error3) {
          console.error('All click methods failed:', error3);
        }
      }
    }
  }
  
  // Check if text looks like a task title
  function isLikelyTaskTitle(text) {
    if (!text || text.length < 5 || text.length > 300) return false;
    
    // Skip common UI elements
    const skipPatterns = [
      /^(home|menu|login|logout|settings|profile|search|filter|sort|edit|delete|save|cancel|submit|back|next|previous)$/i,
      /^(yes|no|ok|cancel|close|open|show|hide|expand|collapse)$/i,
      /^[\d\s\-\/]+$/, // Only numbers, spaces, dashes, slashes
      /^[^a-zA-Z]*$/ // No letters at all
    ];
    
    return !skipPatterns.some(pattern => pattern.test(text));
  }
  
  // Clean up task title text
  function cleanTaskTitle(text) {
    return text
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\r\n\t]/g, ' ') // Remove line breaks
      .trim()
      .substring(0, 200); // Limit length
  }
  
  // Send task titles to background script
  async function sendTaskTitles(titles) {
    try {
      await chrome.runtime.sendMessage({
        type: 'TASK_TITLES_FOUND',
        titles: titles
      });
      console.log('Task titles sent to background script');
    } catch (error) {
      console.error('Error sending message to background script:', error);
    }
  }
  
  // Send error to background script
  async function sendErrorToBackground(error) {
    try {
      await chrome.runtime.sendMessage({
        type: 'CONTENT_SCRIPT_ERROR',
        error: error
      });
    } catch (err) {
      console.error('Error sending error message:', err);
    }
  }
  
  // Utility sleep function
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Start automation when script loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(startAutomation, 1000);
    });
  } else {
    setTimeout(startAutomation, 1000);
  }
  
})();