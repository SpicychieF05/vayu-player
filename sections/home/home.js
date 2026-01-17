import { escapeHtml, safeLocalStorageSet } from '../common/utils.js';

export class HomeManager {
    constructor(player) {
        this.player = player;
        this.pinnedSection = document.getElementById('pinnedSection');
        this.pinnedList = document.getElementById('pinnedList');
        this.recentSection = document.getElementById('recentSection');
        this.recentList = document.getElementById('recentList');
        this.clearRecentBtn = document.getElementById('clearRecent');
        
        this.init();
    }

    init() {
        this.setupEventDelegation();
        this.loadHistory();
        
        if(this.clearRecentBtn) {
            this.clearRecentBtn.addEventListener('click', () => this.clearHistory());
        }

        window.addEventListener('vayu-video-start', (e) => {
            if(e.detail && e.detail.url) {
                this.addToHistory(e.detail.url);
            }
        });
    }

    setupEventDelegation() {
        if (this.pinnedList) {
            this.pinnedList.addEventListener('click', (e) => this.handlePinnedClick(e));
        }
        if (this.recentList) {
            this.recentList.addEventListener('click', (e) => this.handleRecentClick(e));
        }
    }

    loadHistory() {
        this.renderPinned();
        this.renderHistory();
    }

    addToHistory(url) {
        let history = JSON.parse(localStorage.getItem('vayu_player_history') || '[]');
        // Remove if already exists
        history = history.filter(item => item.url !== url);
        // Add to beginning
        history.unshift({
            url: url,
            timestamp: Date.now()
        });
        // Keep last 10
        history = history.slice(0, 10);
        safeLocalStorageSet('vayu_player_history', JSON.stringify(history));
        this.renderHistory();
    }

    // --- PINNED VIDEOS ---
    getPinned() {
        return JSON.parse(localStorage.getItem('vayu_player_pinned') || '[]');
    }

    savePinned(pinned) {
        safeLocalStorageSet('vayu_player_pinned', JSON.stringify(pinned));
    }

    pinVideo(url, name = null) {
        let pinned = this.getPinned();
        // Check if already pinned
        if (pinned.find(p => p.url === url)) {
            if(this.player.showToast) this.player.showToast('Already pinned!');
            return;
        }
        
        // Prompt for name if not provided
        const displayName = name || prompt('Enter a name for this video:', this.truncateUrl(url));
        if (displayName === null) return; // User cancelled
        
        pinned.push({
            url: url,
            name: displayName || this.truncateUrl(url),
            timestamp: Date.now()
        });
        
        this.savePinned(pinned);
        this.renderPinned();
        this.renderHistory(); // Refresh history to hide pinned item
        if(this.player.showToast) this.player.showToast('Video pinned!');
    }

    unpinVideo(url) {
        let pinned = this.getPinned();
        pinned = pinned.filter(p => p.url !== url);
        this.savePinned(pinned);
        this.renderPinned();
        this.renderHistory();
        if(this.player.showToast) this.player.showToast('Unpinned');
    }

    renamePinned(url) {
        let pinned = this.getPinned();
        const item = pinned.find(p => p.url === url);
        if (!item) return;
        
        const newName = prompt('Enter new name:', item.name);
        if (newName === null || newName.trim() === '') return;
        
        item.name = newName.trim();
        this.savePinned(pinned);
        this.renderPinned();
        if(this.player.showToast) this.player.showToast('Renamed!');
    }

    renderPinned() {
        if(!this.pinnedSection || !this.pinnedList) return;

        const pinned = this.getPinned();
        
        if (pinned.length === 0) {
            this.pinnedSection.style.display = 'none';
            return;
        }

        this.pinnedSection.style.display = 'block';
        
        this.pinnedList.innerHTML = pinned.map(item => `
            <div class="pinned-item" data-url="${escapeHtml(item.url)}">
                <div class="pinned-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7-11-7z"/></svg>
                </div>
                <div class="pinned-info">
                    <div class="pinned-name">${escapeHtml(item.name)}</div>
                    <div class="pinned-url">${escapeHtml(this.truncateUrl(item.url))}</div>
                </div>
                <div class="pinned-actions">
                    <button class="pin-action-btn rename-btn" data-url="${escapeHtml(item.url)}" title="Rename">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="pin-action-btn delete unpin-btn" data-url="${escapeHtml(item.url)}" title="Unpin">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderHistory() {
        if(!this.recentSection || !this.recentList) return;

        const history = JSON.parse(localStorage.getItem('vayu_player_history') || '[]');
        const pinned = this.getPinned();
        const pinnedUrls = pinned.map(p => p.url);
        
        // Filter out pinned items from history display
        const unpinnedHistory = history.filter(item => !pinnedUrls.includes(item.url));
        
        if (unpinnedHistory.length === 0) {
            this.recentSection.style.display = 'none';
            return;
        }

        this.recentSection.style.display = 'block';
        
        this.recentList.innerHTML = unpinnedHistory.map(item => `
            <div class="recent-item" data-url="${escapeHtml(item.url)}">
                <div class="recent-thumbnail">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v20M2 12h20" opacity="0.1"/>
                        <path d="M8 5v14l11-7-11-7z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="recent-info">
                    <div class="recent-url">${escapeHtml(this.truncateUrl(item.url))}</div>
                    <div class="recent-name" style="display:none; transition: all 0.2s;" data-full="${escapeHtml(item.url)}">Unknown</div>
                    <div class="recent-date">${new Date(item.timestamp).toLocaleDateString()}</div>
                </div>
                <div class="recent-actions">
                    <button class="pin-action-btn pin-btn" data-url="${escapeHtml(item.url)}" title="Pin this video">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                    <button class="pin-action-btn delete delete-history-btn" data-url="${escapeHtml(item.url)}" title="Remove from history">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    handlePinnedClick(e) {
        const item = e.target.closest('.pinned-item');
        if (!item) return;

        // Rename
        if (e.target.closest('.rename-btn')) {
            e.stopPropagation();
            const url = item.dataset.url;
            this.renamePinned(url);
            return;
        }

        // Unpin
        if (e.target.closest('.unpin-btn')) {
            e.stopPropagation();
            const url = item.dataset.url;
            this.unpinVideo(url);
            return;
        }

        // Play
        const url = item.dataset.url;
        if (url) {
            // Load and play the video
            if(this.player.loadDirectVideo) {
                this.player.loadDirectVideo(url);
                // Show the player section
                if(this.player.showPlayerSection) {
                    this.player.showPlayerSection();
                }
            }
        }
    }

    handleRecentClick(e) {
        const item = e.target.closest('.recent-item');
        if (!item) return;

        // Pin
        if (e.target.closest('.pin-btn')) {
             e.stopPropagation();
             const url = item.dataset.url;
             // Try to get title from recent-name if visible/available
             // For now just use truncated url
             this.pinVideo(url);
             return;
        }

        // Delete from history
        if (e.target.closest('.delete-history-btn')) {
            e.stopPropagation();
            const url = item.dataset.url;
            this.deleteFromHistory(url);
            return;
        }

        // Play
        const url = item.dataset.url;
        if (url) {
            // Load and play the video
            if(this.player.loadDirectVideo) {
                this.player.loadDirectVideo(url);
                // Show the player section
                if(this.player.showPlayerSection) {
                    this.player.showPlayerSection();
                }
            }
        }
    }

    deleteFromHistory(url) {
        let history = JSON.parse(localStorage.getItem('vayu_player_history') || '[]');
        history = history.filter(item => item.url !== url);
        safeLocalStorageSet('vayu_player_history', JSON.stringify(history));
        this.renderHistory();
        if(this.player.showToast) this.player.showToast('Removed from history');
    }

    clearHistory() {
        localStorage.removeItem('vayu_player_history');
        this.renderHistory();
    }

    truncateUrl(url) {
        try {
            const u = new URL(url);
            return u.hostname + u.pathname;
        } catch (e) {
            return url;
        }
    }
}
