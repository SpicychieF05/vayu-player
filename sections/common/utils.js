export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function handleStorageQuotaExceeded(newKey) {
  // Clear old history if we're saving new history/position data
  if (newKey.includes('history') || newKey.includes('position')) {
    const history = JSON.parse(localStorage.getItem('vayu_player_history') || '[]');
    if (history.length > 5) {
      // Keep only 5 most recent
      const trimmed = history.slice(0, 5);
      localStorage.setItem('vayu_player_history', JSON.stringify(trimmed));
    }
    
    // Clear old playback positions
    const positions = JSON.parse(localStorage.getItem('vayu_playback_positions') || '{}');
    const posKeys = Object.keys(positions);
    if (posKeys.length > 10) {
      // Keep only 10 most recent
      const sorted = posKeys.sort((a, b) => positions[b].timestamp - positions[a].timestamp);
      const newPos = {};
      sorted.slice(0, 10).forEach(key => newPos[key] = positions[key]);
      localStorage.setItem('vayu_playback_positions', JSON.stringify(newPos));
    }
  }
}

export function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded');
      handleStorageQuotaExceeded(key); // Call the exported function
      // Try again after cleanup
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('Failed to save after cleanup:', retryError);
        return false;
      }
    }
    console.error('LocalStorage error:', e);
    return false;
  }
}

export function validateVideoUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { 
        valid: false, 
        reason: 'Only HTTP/HTTPS URLs are supported' 
      };
    }
    
    // Check suspicious URLs (basic security check)
    if (urlObj.hostname === 'localhost' || urlObj.hostname.includes('.local')) {
      console.warn('Warning: Loading from localhost');
    }
    
    return { valid: true };
  } catch (e) {
    return { 
      valid: false, 
      reason: 'Invalid URL format' 
    };
  }
}
