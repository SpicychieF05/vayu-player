export class AddVideoModal {
  constructor(libraryManager) {
    this.libraryManager = libraryManager;
    this.modal = document.getElementById('addVideoModal');
    this.openBtn = document.getElementById('openAddModalBtn');
    this.closeBtn = document.getElementById('closeAddVideoModal');
    this.form = document.getElementById('addVideoForm');
    this.resetBtn = document.getElementById('resetAddForm');
    
    this.bindEvents();
  }

  bindEvents() {
    if(this.openBtn) this.openBtn.addEventListener('click', () => this.open());
    if(this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if(this.modal) {
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
    }
    
    if(this.resetBtn) this.resetBtn.addEventListener('click', () => this.form.reset());
    
    if(this.form) {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }
  }

  open() {
    if(this.modal) this.modal.classList.add('active');
  }

  close() {
    if(this.modal) this.modal.classList.remove('active');
    if(this.form) this.form.reset();
  }

  handleSubmit() {
    const name = document.getElementById('addVideoName').value.trim();
    const link = document.getElementById('addVideoLink').value.trim();
    const type = document.getElementById('addVideoType').value;
    const lang = document.getElementById('addVideoLang').value;
    const user = document.getElementById('addVideoUser').value.trim() || 'Anonymous';
    
    if (!name || !link) return;

    this.libraryManager.addItem({ name, link, type, lang, user });
    this.close();
  }
}
