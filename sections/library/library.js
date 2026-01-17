import { escapeHtml } from '../common/utils.js';
import { AddVideoModal } from './add-modal.js';

export class LibraryManager {
  constructor(player) {
    this.player = player;
    this.STORAGE_KEY = 'vayu_shared_library';
    this.items = [];
    
    // Bind DOM
    this.section = document.getElementById('librarySection');
    this.navBtn = document.getElementById('libraryNavBtn');
    this.grid = document.getElementById('libraryGrid');
    this.search = document.getElementById('librarySearch');
    this.filters = document.getElementById('libraryFilters');
    this.emptyState = document.getElementById('libraryEmpty');
    
    this.addModal = new AddVideoModal(this);
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadLibrary();
  }

  bindEvents() {
    // Navigation (Toggle Logic)
    if(this.navBtn) {
        this.navBtn.addEventListener('click', () => {
             const isLibraryActive = !this.section.classList.contains('hidden');
             if (isLibraryActive) {
                 this.player.showUrlSection();
             } else {
                 this.player.showLibrarySection();
             }
        });
    }
    
    // Search & Filter
    if(this.search) this.search.addEventListener('input', () => this.render());
    
    if(this.filters) {
        this.filters.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-chip')) {
                this.filters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                this.render();
            }
        });
    }
  }

  loadLibrary() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
        try {
            this.items = JSON.parse(saved);
        } catch (e) {
            console.error("Library parse error", e);
            this.items = [];
        }
    } else {
        this.items = [];
    }
    this.render();
  }

  saveLibrary() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
  }

  addItem({ name, link, type, lang, user }) {
    const newItem = {
        id: Date.now().toString(),
        name,
        link,
        type,
        lang,
        user,
        addedAt: new Date().toISOString()
    };
    
    this.items.unshift(newItem); // Add to top
    this.saveLibrary();
    this.render();
    if(this.player.showToast) this.player.showToast('Video added to Library');
  }

  render() {
    if(!this.grid) return;
    
    const query = this.search ? this.search.value.toLowerCase() : '';
    const activeFilterEl = this.filters ? this.filters.querySelector('.active') : null;
    const activeFilter = activeFilterEl ? activeFilterEl.dataset.filter : 'all';
    
    // Filter items
    const filtered = this.items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(query) || 
                              (item.user && item.user.toLowerCase().includes(query));
        const matchesType = activeFilter === 'all' || item.type === activeFilter;
        return matchesSearch && matchesType;
    });
    
    this.grid.innerHTML = '';
    
    if (filtered.length === 0) {
        if(this.emptyState) this.emptyState.classList.remove('hidden');
    } else {
        if(this.emptyState) this.emptyState.classList.add('hidden');
        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'library-card';
            card.dataset.type = item.type;
            card.innerHTML = `
                <div class="lib-card-content">
                    <div class="lib-card-header">
                        <h3 class="lib-card-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</h3>
                        <div class="lib-card-meta">
                            <span class="lib-badge">${item.type}</span>
                            <span>•</span>
                            <span>${item.lang}</span>
                        </div>
                    </div>
                    <div class="lib-card-footer">
                        <span class="lib-user">Added by ${escapeHtml(item.user)}</span>
                        <div class="lib-play-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                // Assuming player has loadDirectVideo
                if (typeof this.player.loadDirectVideo === 'function') {
                    this.player.loadDirectVideo(item.link);
                } else if (this.player.urlInput) {
                    this.player.urlInput.value = item.link;
                    if(this.player.loadVideo) this.player.loadVideo();
                }
            });
            
            this.grid.appendChild(card);
        });
    }
  }
}
