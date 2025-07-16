document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('open-sidebar-btn');
  const status = document.getElementById('sidebar-status');
  if (btn) {
    btn.onclick = async function() {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        try {
          let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
          await chrome.sidePanel.open({windowId: tab.windowId});
        } catch (e) {
          if (status) status.textContent = 'Failed to open side panel: ' + e;
        }
      } else {
        if (status) status.textContent = 'Side Panel API not available in this version of Chrome.';
      }
    };
  }
}); 