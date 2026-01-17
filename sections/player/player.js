import { escapeHtml, safeLocalStorageSet, validateVideoUrl } from '../common/utils.js';

export class VayuPlayer {
  constructor() {
    // DOM Elements
    this.urlSection = document.getElementById("urlSection");
    this.playerSection = document.getElementById("playerSection");
    this.playerContainer = document.getElementById("playerContainer");
    this.video = document.getElementById("videoPlayer");
    this.urlInput = document.getElementById("videoUrl");
    this.loadBtn = document.getElementById("loadBtn");
    this.backBtn = document.getElementById("backBtn");
    this.logoHomeLink = document.getElementById("logoHomeLink");
    this.useProxyCheckbox = document.getElementById("useProxy");

    // Overlays
    this.loadingOverlay = document.getElementById("loadingOverlay");
    this.playOverlay = document.getElementById("playOverlay");
    this.errorOverlay = document.getElementById("errorOverlay");
    this.errorText = document.getElementById("errorText");
    this.bufferIndicator = document.getElementById("bufferIndicator");

    // Controls
    this.controls = document.getElementById("controls");
    this.playPauseBtn = document.getElementById("playPauseBtn");
    this.bigPlayBtn = document.getElementById("bigPlayBtn");
    this.skipBackBtn = document.getElementById("skipBackBtn");
    this.skipForwardBtn = document.getElementById("skipForwardBtn");
    this.muteBtn = document.getElementById("muteBtn");
    this.volumeSlider = document.getElementById("volumeSlider");
    this.volumeFill = document.getElementById("volumeFill");
    this.fullscreenBtn = document.getElementById("fullscreenBtn");
    this.pipBtn = document.getElementById("pipBtn");
    this.speedBtn = document.getElementById("speedBtn");
    this.speedMenu = document.getElementById("speedMenu");
    this.speedValue = document.getElementById("speedValue");
    this.retryBtn = document.getElementById("retryBtn");

    // Progress
    this.progressContainer = document.getElementById("progressContainer");
    this.progressBuffer = document.getElementById("progressBuffer");
    this.progressPlayed = document.getElementById("progressPlayed");
    this.progressThumb = document.getElementById("progressThumb");
    this.progressTooltip = document.getElementById("progressTooltip");

    // Time Display
    this.currentTimeEl = document.getElementById("currentTime");
    this.durationEl = document.getElementById("duration");
    this.timeDisplay = document.getElementById("timeDisplay");
    this.timeInputWrapper = document.getElementById("timeInputWrapper");
    this.timeInput = document.getElementById("timeInput");
    this.timeGoBtn = document.getElementById("timeGoBtn");

    // Stats
    this.bufferPercent = document.getElementById("bufferPercent");
    this.networkSpeed = document.getElementById("networkSpeed");

    // Shortcuts Modal
    this.shortcutsModal = document.getElementById("shortcutsModal");
    this.closeShortcuts = document.getElementById("closeShortcuts");

    // History Section
    this.recentSection = document.getElementById("recentSection");
    this.recentList = document.getElementById("recentList");
    this.clearRecentBtn = document.getElementById("clearRecent");

    // Quality Control
    this.qualityBtn = document.getElementById("qualityBtn");
    this.qualityMenu = document.getElementById("qualityMenu");
    this.qualityValue = document.getElementById("qualityValue");

    // State
    this.isPlaying = false;
    this.isMuted = false;
    this.isFullscreen = false;
    this.controlsTimeout = null;
    this.cursorTimeout = null;
    this.lastVolume = 1;
    this.currentUrl = "";
    this.loadStartTime = 0;
    this.bytesLoaded = 0;

    // Buffer Management
    this.bufferCheckInterval = null;
    this.targetBufferAhead = 60; // seconds to buffer ahead
    this.historyBufferRatio = 0.1; // 10% of watched video as history buffer
    this.maxWatchedPosition = 0; // track furthest watched position
    this.bufferRanges = []; // store all buffer ranges for visualization

    // Network speed tracking
    this.lastBufferTime = 0;
    this.lastBufferedAmount = 0;
    this.networkSpeedSamples = [];
    this.maxSpeedSamples = 10; // rolling average of last 10 samples

    // Range request support detection
    this.supportsRangeRequests = null; // null = unknown, true/false after check
    this.rangeRequestChecked = false;

    // Dynamic Library URLs
    this.HLS_LIB = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    this.DASH_LIB =
      "https://cdn.jsdelivr.net/npm/dashjs@latest/dist/dash.all.min.js";

    // Error recovery
    this.retryAttempts = 0;
    this.maxRetryAttempts = 3;

    // Network status
    this.isOnline = navigator.onLine;

    // Playback position tracking
    this.lastSavedSecond = -1;

    // Video title display
    this.videoTitleOverlay = document.getElementById('videoTitleOverlay');
    this.videoTitleText = document.getElementById('videoTitleText');
    this.currentVideoTitle = '';

    this.init();
  }

  // Utils imported from common/utils.js

  init() {
    this.bindEvents();
    this.setupVideoEvents();
    this.setupWheelControls();
    this.setupGestures();
    this.setupNetworkMonitoring();
    this.updateVolumeUI();

    // Focus input on load
    this.urlInput.focus();

    // Check for URL in query params
    const params = new URLSearchParams(window.location.search);
    const videoUrl = params.get("url");
    if (videoUrl) {
      this.urlInput.value = decodeURIComponent(videoUrl);
      this.loadVideo();
    }
  }

  /**
   * Setup network status monitoring
   */
  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showToast('Connection restored');
      console.log('Network: Online');
      
      // Auto retry if video errored due to network
      if (this.video.error && !this.isPlaying) {
        setTimeout(() => {
          this.showToast('Attempting to resume...');
          this.loadVideo();
        }, 1000);
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showToast('Connection lost - video may buffer', 5000);
      console.warn('Network: Offline');
    });
  }

  // History handlers removed (moved to HomeManager)

  bindEvents() {
    // URL Input
    this.loadBtn.addEventListener("click", () => this.loadVideo());
    this.urlInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.loadVideo();
    });
    this.backBtn.addEventListener("click", () => this.showUrlSection());
    this.logoHomeLink.addEventListener("click", () => this.showUrlSection());
    this.retryBtn.addEventListener("click", () => this.loadVideo());

    // Error Overlay - Click outside to close
    this.errorOverlay.addEventListener("click", (e) => {
        if (e.target === this.errorOverlay) {
            this.hideError();
        }
    });

    // Play Controls
    this.playPauseBtn.addEventListener("click", () => this.togglePlay());
    this.bigPlayBtn.addEventListener("click", () => this.togglePlay());
    this.skipBackBtn.addEventListener("click", () => this.skip(-10));
    this.skipForwardBtn.addEventListener("click", () => this.skip(10));

    // Volume
    this.muteBtn.addEventListener("click", () => this.toggleMute());
    this.volumeSlider.addEventListener("input", (e) =>
      this.setVolume(e.target.value)
    );

    // Progress Bar
    this.progressContainer.addEventListener("click", (e) => this.seek(e));
    this.progressContainer.addEventListener("mousemove", (e) =>
      this.updateTooltip(e)
    );

    // Add drag support for progress bar
    let isDragging = false;
    this.progressContainer.addEventListener("mousedown", (e) => {
      isDragging = true;
      this.seek(e);
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        this.seek(e);
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Fullscreen & PiP
    this.fullscreenBtn.addEventListener("click", () => this.toggleFullscreen());
    this.pipBtn.addEventListener("click", () => this.togglePiP());

    // Time Input - click time display to show input
    this.timeDisplay.addEventListener("click", () => this.showTimeInput());
    this.timeGoBtn.addEventListener("click", () => this.jumpToInputTime());
    this.timeInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.jumpToInputTime();
    });
    this.timeInput.addEventListener("blur", () => {
      // Hide input after a short delay (allows clicking Go button)
      setTimeout(() => this.hideTimeInput(), 200);
    });

    // Speed Menu
    this.speedBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.speedMenu.classList.toggle("active");
    });

    document.querySelectorAll(".speed-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        const speed = parseFloat(e.target.dataset.speed);
        this.setPlaybackSpeed(speed);
      });
    });

    // Custom speed input
    const customSpeedInput = document.getElementById("customSpeedInput");
    const customSpeedBtn = document.getElementById("customSpeedBtn");

    if (customSpeedBtn && customSpeedInput) {
      customSpeedBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const speed = parseFloat(customSpeedInput.value);
        if (speed >= 0.1 && speed <= 100) {
          this.setPlaybackSpeed(speed);
          customSpeedInput.value = "";
        }
      });

      customSpeedInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          const speed = parseFloat(customSpeedInput.value);
          if (speed >= 0.1 && speed <= 100) {
            this.setPlaybackSpeed(speed);
            customSpeedInput.value = "";
          }
        }
      });

      customSpeedInput.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }

    // Close speed menu when clicking outside
    document.addEventListener("click", () => {
      this.speedMenu.classList.remove("active");
    });

    // Quality Menu
    this.qualityBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.qualityMenu.classList.toggle("active");
    });

    // Close quality menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest('.quality-container')) {
        this.qualityMenu.classList.remove("active");
      }
    });

    // Shortcuts Modal
    this.closeShortcuts.addEventListener("click", () => {
      this.shortcutsModal.classList.remove("active");
    });

    // Keyboard Shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));

    // History Management
    this.clearRecentBtn.addEventListener("click", () => this.clearHistory());

    // Controls visibility
    this.playerContainer.addEventListener("mousemove", () =>
      this.showControls()
    );
    this.playerContainer.addEventListener("mouseleave", () =>
      this.hideControls()
    );

    // Click to play/pause
    this.video.addEventListener("click", () => this.togglePlay());

    // Double-click to fullscreen
    this.video.addEventListener("dblclick", () => this.toggleFullscreen());

    // Fullscreen change
    document.addEventListener("fullscreenchange", () =>
      this.onFullscreenChange()
    );
    document.addEventListener("webkitfullscreenchange", () =>
      this.onFullscreenChange()
    );
  }

  setupVideoEvents() {
    // Loading states
    this.video.addEventListener("loadstart", () => {
      this.loadStartTime = Date.now();
      this.maxWatchedPosition = 0; // Reset watched position
      this.bufferRanges = [];
      this.showLoading();
    });

    this.video.addEventListener("loadedmetadata", () => {
      // Clear load timeout
      if (this.loadTimeout) {
        clearTimeout(this.loadTimeout);
        this.loadTimeout = null;
      }

      this.durationEl.textContent = this.formatTime(this.video.duration);
      this.hideLoading();
      // Start buffer management once we have metadata
      this.startBufferManagement();
      // Initialize speed status
      this.updateSpeedStatus();

      // Restore playback position if available
      const savedPosition = this.getPlaybackPosition(this.originalUrl || this.currentUrl);
      if (savedPosition && savedPosition > 5 && savedPosition < this.video.duration - 10) {
        this.video.currentTime = savedPosition;
        this.showToast(`Resuming from ${this.formatTime(savedPosition)}`, 3000);
      }

      // Reset retry attempts on successful load
      this.retryAttempts = 0;

      console.log(
        `Video loaded: ${this.formatTime(this.video.duration)} duration`
      );
    });

    this.video.addEventListener("canplay", () => {
      this.hideLoading();
      this.playOverlay.classList.remove("hidden");
    });

    this.video.addEventListener("canplaythrough", () => {
      this.hideLoading();
    });

    this.video.addEventListener("waiting", () => {
      this.showLoading();
    });

    this.video.addEventListener("playing", () => {
      this.hideLoading();
      this.isPlaying = true;
      this.playerContainer.classList.add("playing");
      this.playOverlay.classList.add("hidden");
      // Hide controls immediately when playback starts
      this.hideControls();
    });

    this.video.addEventListener("pause", () => {
      this.isPlaying = false;
      this.playerContainer.classList.remove("playing");
      // Show controls when paused
      this.showControls();
      // Continue buffering even when paused - browser handles this
      // but we update the UI to show buffer progress
      this.updateBuffer();
    });

    this.video.addEventListener("ended", () => {
      this.isPlaying = false;
      this.playerContainer.classList.remove("playing");
      this.playOverlay.classList.remove("hidden");
      // Clear saved position when video completes
      this.clearPlaybackPosition(this.originalUrl || this.currentUrl);
    });

    // Time update - save position periodically
    this.video.addEventListener("timeupdate", () => {
      this.updateProgress();
      // Track max watched position for history buffer
      if (this.video.currentTime > this.maxWatchedPosition) {
        this.maxWatchedPosition = this.video.currentTime;
      }
      
      // Save playback position every 5 seconds (when second value changes to 0 or 5)
      const currentSecond = Math.floor(this.video.currentTime);
      if (this.video.currentTime > 5 && currentSecond % 5 === 0 && currentSecond !== this.lastSavedSecond) {
        this.lastSavedSecond = currentSecond;
        this.savePlaybackPosition(this.originalUrl || this.currentUrl, this.video.currentTime);
      }
    });

    // Buffer progress - fires when browser downloads more data
    this.video.addEventListener("progress", () => this.updateBuffer());

    // Also update buffer on seeking
    this.video.addEventListener("seeked", () => {
      this.updateBuffer();
    });

    // Error handling
    this.video.addEventListener("error", (e) => this.handleError(e));

    // Volume change
    this.video.addEventListener("volumechange", () => this.updateVolumeUI());
  }

  loadVideo() {
    let url = this.urlInput.value.trim();
    if (!url) {
      this.urlInput.focus();
      return;
    }

    // Validate URL before proceeding
    const validation = validateVideoUrl(url);
    if (!validation.valid) {
      this.showError(validation.reason);
      this.urlInput.focus();
      return;
    }

    // Check network status
    if (!this.isOnline) {
      this.showError('No internet connection.\nPlease check your network and try again.');
      return;
    }

    // Reset retry attempts on manual load
    this.retryAttempts = 0;

    // Check if proxy should be used
    const useProxy = this.useProxyCheckbox && this.useProxyCheckbox.checked;
    if (useProxy) {
      // Use proxy server
      const isStatic = window.location.protocol === 'file:';
      const proxyBase = isStatic ? 'http://localhost:4000/proxy' : '/proxy';
      url = `${proxyBase}?url=${encodeURIComponent(url)}`;
      console.log("🔄 Using proxy for URL");
    }

    this.currentUrl = url;
    this.originalUrl = this.urlInput.value.trim(); // Store original for display
    this.hideError();
    this.showPlayerSection();
    this.showLoading();
    // Dispatch event for HomeManager
    window.dispatchEvent(new CustomEvent('vayu-video-start', { detail: { url: this.originalUrl } }));

    // Reset network speed tracking
    this.lastBufferTime = 0;
    this.lastBufferedAmount = 0;
    this.networkSpeedSamples = [];
    this.loadStartTime = Date.now();

    // Reset CORS retry flags
    this.triedWithoutCors = false;
    this.triedWithCors = false;
    this.rangeRequestChecked = false;

    // Check if HLS stream
    if (url.includes(".m3u8")) {
      this.handleHLSSupport(url);
    } else if (url.includes(".mpd")) {
      this.handleDASHSupport(url);
    } else {
      // Direct video URL - try loading with best settings for streaming
      this.loadDirectVideo(url);
    }

    // Update URL params
    try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("url", encodeURIComponent(url));
        window.history.replaceState({}, "", newUrl);
    } catch(e) { console.error("History update failed", e); }
  }

  async loadDirectVideo(url) {
    // Reset video element for fresh load
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();

    // Configure for streaming with HEVC audio support
    this.video.preload = "auto";
    
    // Ensure audio is enabled (critical for HEVC files)
    this.video.muted = false;
    this.video.volume = 1.0;
    
    // Detect if this might be a HEVC file
    const isHEVC = url.toLowerCase().includes('hevc') || 
                   url.toLowerCase().includes('h265') || 
                   url.toLowerCase().includes('x265');
    
    if (isHEVC) {
      console.log('🎥 HEVC video detected - ensuring audio codec compatibility');
    }

    // Check if it's a Google URL (they have specific requirements)
    const isGoogleUrl =
      url.includes("googleusercontent.com") ||
      url.includes("googlevideo.com") ||
      url.includes("google.com");

    if (isGoogleUrl) {
      console.log(
        "🔗 Detected Google video URL - may expire after a few hours"
      );
      // Google URLs work better without crossorigin attribute
      this.video.removeAttribute("crossorigin");
    }

    // Check if server supports Range requests (for seeking)
    if (!this.rangeRequestChecked) {
      this.checkRangeRequestSupport(url);
    }

    // Set the source and load
    this.video.src = url;
    this.video.load();

    // Extract and display video title
    this.setVideoTitle(this.extractVideoTitle(url));

    // Detect embedded audio tracks and subtitles when metadata loads
    const detectTracks = () => {
      console.log('🎬 Video metadata loaded, checking for embedded tracks...');
      
      // Log video codec information
      console.log('📊 Video Properties:', {
        duration: this.video.duration,
        videoWidth: this.video.videoWidth,
        videoHeight: this.video.videoHeight,
        readyState: this.video.readyState
      });
      
      // Check for audio tracks
      if (this.video.audioTracks && this.video.audioTracks.length > 0) {
        console.log(`🔊 Found ${this.video.audioTracks.length} audio track(s)`);
        
        // Enable all audio tracks (important for HEVC)
        for (let i = 0; i < this.video.audioTracks.length; i++) {
          const track = this.video.audioTracks[i];
          console.log(`  Track ${i}: ${track.label || track.language || 'Unknown'} - ${track.enabled ? 'Enabled' : 'Disabled'}`);
          
          // Enable the first track by default if none are enabled
          if (i === 0 && !track.enabled) {
            track.enabled = true;
            console.log(`  ✅ Enabled audio track ${i}`);
          }
        }
        
        this.updateAudioTrackList();
      } else {
        console.log('🔇 No separate audio tracks detected (audio may be muxed with video)');
        
        // For HEVC files without separate tracks, verify audio is working
        if (isHEVC) {
          console.log('⚠️ HEVC file without separate audio tracks detected');
          console.log('   If no audio plays, the file may use an unsupported audio codec');
          console.log('   Supported: AAC, MP3, Opus, Vorbis');
          console.log('   Limited support: AC3, EAC3 (requires browser/OS support)');
        }
      }
      
      // Verify audio is not muted
      if (this.video.muted) {
        console.warn('⚠️ Video was muted, unmuting...');
        this.video.muted = false;
      }
      
      if (this.video.volume === 0) {
        console.warn('⚠️ Volume was 0, setting to 1.0...');
        this.video.volume = 1.0;
      }
      
      // Check for text tracks (subtitles/captions)
      if (this.video.textTracks && this.video.textTracks.length > 0) {
        console.log(`📝 Found ${this.video.textTracks.length} subtitle track(s)`);
        this.updateSubtitleList();
      }
    };
    
    // Listen for metadata load
    this.video.addEventListener('loadedmetadata', detectTracks, { once: true });
    
    // Add additional audio verification when video can play
    const verifyAudio = () => {
      console.log('🔍 Verifying audio setup...');
      console.log('   Muted:', this.video.muted);
      console.log('   Volume:', this.video.volume);
      console.log('   Audio Tracks:', this.video.audioTracks ? this.video.audioTracks.length : 'Not supported by browser');
      
      // Force unmute if somehow muted
      if (this.video.muted) {
        this.video.muted = false;
        console.log('   ✅ Forced unmute');
      }
    };
    
    this.video.addEventListener('canplay', verifyAudio, { once: true });

    // Add timeout for stuck loading
    this.loadTimeout = setTimeout(() => {
      if (this.video.readyState < 2) {
        // HAVE_CURRENT_DATA
        console.warn("Video loading is taking too long...");
        // Try without any special attributes
        this.video.removeAttribute("crossorigin");
        this.video.load();
      }
    }, 10000); // 10 second timeout
  }

  extractVideoTitle(url) {
    try {
      const urlObj = new URL(url);
      const pathname = decodeURIComponent(urlObj.pathname);
      
      // Extract filename from path
      const filename = pathname.split('/').pop();
      
      // Remove file extension
      const nameWithoutExt = filename.replace(/\.(mkv|mp4|avi|webm|m3u8|mpd|mov|flv)$/i, '');
      
      // Clean up the title
      let cleanTitle = nameWithoutExt
        // Remove quality indicators
        .replace(/\b(1080p|720p|480p|360p|2160p|4K|UHD|HD|SD)\b/gi, '')
        // Remove codec info
        .replace(/\b(x264|x265|HEVC|H\.264|H\.265|10bit|8bit)\b/gi, '')
        // Remove source info
        .replace(/\b(BluRay|BRRip|WEB-DL|WEBRip|HDTV|DVDRip|BDRip)\b/gi, '')
        // Remove audio info in brackets
        .replace(/\[.*?(DD|DTS|AAC|AC3|Atmos).*?\]/gi, '')
        // Remove release group tags
        .replace(/[-_.]\w+$/g, '')
        // Replace dots, underscores, and multiple spaces
        .replace(/[._]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // If title is too long, truncate intelligently
      if (cleanTitle.length > 60) {
        // Try to find year and cut after it
        const yearMatch = cleanTitle.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          const yearIndex = cleanTitle.indexOf(yearMatch[0]);
          cleanTitle = cleanTitle.substring(0, yearIndex + 4).trim();
        } else {
          cleanTitle = cleanTitle.substring(0, 60).trim() + '...';
        }
      }
      
      return cleanTitle || 'Unknown Video';
    } catch (e) {
      console.error('Error extracting title:', e);
      return 'Unknown Video';
    }
  }

  setVideoTitle(title) {
    this.currentVideoTitle = title;
    if (this.videoTitleText) {
      this.videoTitleText.textContent = title;
    }
  }

  async checkRangeRequestSupport(url) {
    this.rangeRequestChecked = true;

    try {
      const response = await fetch(url, {
        method: "HEAD",
        mode: "cors",
      });

      const acceptRanges = response.headers.get("Accept-Ranges");
      const contentLength = response.headers.get("Content-Length");

      this.supportsRangeRequests = acceptRanges === "bytes";

      if (this.supportsRangeRequests) {
        console.log(`✅ Server supports Range requests (byte-seeking enabled)`);
        if (contentLength) {
          const sizeMB = (parseInt(contentLength) / 1024 / 1024).toFixed(1);
          console.log(`📦 File size: ${sizeMB} MB`);
        }
      } else {
        console.warn(
          `⚠️ Server doesn't support Range requests - seeking may require re-download`
        );
        this.showRangeWarning();
      }
    } catch (error) {
      console.warn("Could not check Range request support:", error.message);
      // Assume it works - browser will handle it
      this.supportsRangeRequests = true;
    }
  }

  showRangeWarning() {
    // Show a subtle warning that seeking might not work well
    const warning = document.createElement("div");
    warning.className = "range-warning";
    warning.innerHTML = `
            <span>⚠️ This video may not support seeking to unbuffered positions</span>
        `;
    warning.style.cssText = `
            position: absolute;
            top: 70px;
            right: 20px;
            padding: 10px 16px;
            background: rgba(255, 165, 0, 0.9);
            color: #000;
            border-radius: 8px;
            font-size: 0.85rem;
            z-index: 20;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease 4s forwards;
        `;

    this.playerContainer.appendChild(warning);

    setTimeout(() => {
      warning.remove();
    }, 5000);
  }

  async handleHLSSupport(url) {
    if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = url;
      this.video.load();
    } else {
      await this.loadLibrary('hls-script', this.HLS_LIB);
      this.loadHLS(url);
    }
  }

  async handleDASHSupport(url) {
    await this.loadLibrary('dash-script', this.DASH_LIB);
    this.loadDASH(url);
  }

  loadLibrary(id, url) {
    return new Promise((resolve, reject) => {
      // Check if the library is already globally available (e.g., Hls or dashjs)
      if (window.Hls || window.dashjs) {
        resolve();
        return;
      }

      let script = document.getElementById(id);
      if (script) {
        // If script exists and has the same URL, check its load status
        if (script.src === url) {
          if (script.getAttribute('loaded') === 'true') {
            resolve(); // Already loaded
          } else {
            // Still loading or failed previously, re-attach listeners
            script.addEventListener('load', resolve, { once: true });
            script.addEventListener('error', reject, { once: true });
          }
          return;
        } else {
          // Script exists but with a different URL, remove it to load the new one
          script.remove();
        }
      }

      // Create and append new script element
      script = document.createElement('script');
      script.id = id;
      script.src = url;
      script.async = true; // Load asynchronously
      script.onload = () => {
        script.setAttribute('loaded', 'true');
        resolve();
      };
      script.onerror = (e) => {
        console.error(`Failed to load script: ${url}`, e);
        reject(new Error(`Failed to load script: ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  loadHLS(url) {
    // Check if native HLS is supported (Safari)
    if (this.video.canPlayType("application/vnd.apple.mpegurl")) {
      this.video.src = url;
      this.video.load();
    } else if (typeof Hls !== "undefined") {
      // Use hls.js for other browsers
      this.hlsInstance = new Hls({
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferHole: 0.5,
        enableWebVTT: true,
        enableCEA708Captions: true,
      });
      this.hlsInstance.loadSource(url);
      this.hlsInstance.attachMedia(this.video);
      
      this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        this.hideLoading();
        
        // Detect quality levels for HLS streams
        if (this.hlsInstance.levels && this.hlsInstance.levels.length > 1) {
          console.log("📺 Quality levels detected:", this.hlsInstance.levels);
          this.updateQualityLevels(this.hlsInstance.levels);
        }
        
        // Check for subtitle tracks in HLS manifest
        if (this.hlsInstance.subtitleTracks && this.hlsInstance.subtitleTracks.length > 0) {
          console.log("📝 HLS Subtitle tracks found:", this.hlsInstance.subtitleTracks);
          this.hlsSubtitleTracks = this.hlsInstance.subtitleTracks;
          this.updateHLSTrackList();
        }
      });

      this.hlsInstance.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        this.hlsSubtitleTracks = this.hlsInstance.subtitleTracks;
        this.updateHLSTrackList();
      });
      
      this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          this.showError("HLS stream error: " + data.type);
        }
      });
    } else {
      this.showError(
        "HLS playback not supported. Hls.js library failed to load."
      );
    }
  }

  updateHLSTrackList() {
    if (!this.hlsSubtitleTracks || this.hlsSubtitleTracks.length === 0) return;
    
    this.captionTrackSelect.innerHTML = '<option value="off">Off</option>';
    this.ccBtn.style.display = "flex";
    
    this.hlsSubtitleTracks.forEach((track, index) => {
      const opt = document.createElement("option");
      opt.value = `hls-${index}`;
      opt.textContent = track.name || track.lang || `Subtitle ${index + 1}`;
      this.captionTrackSelect.appendChild(opt);
    });
    
    // Show toast that captions are available
    this.showToast("Captions available");
  }

  setHLSTrack(index) {
    if (this.hlsInstance) {
      this.hlsInstance.subtitleTrack = index;
      this.hlsInstance.subtitleDisplay = true;
      this.ccBtn.classList.add("active");
    }
  }

  loadDASH(url) {
    if (typeof dashjs !== "undefined") {
      const player = dashjs.MediaPlayer().create();
      player.initialize(this.video, url, false);
      player.updateSettings({
        streaming: {
          buffer: {
            fastSwitchEnabled: true,
            bufferTimeAtTopQuality: 30,
            bufferTimeAtTopQualityLongForm: 60,
          },
        },
      });
    } else {
      this.showError("DASH playback requires dash.js library.");
    }
  }

  togglePlay() {
    if (this.video.paused) {
      this.video.play().catch((e) => {
        console.error("Play error:", e);
      });
    } else {
      this.video.pause();
    }
  }

  showControls() {
    // Add class to show controls
    this.playerContainer.classList.add('show-controls');
    
    // Show cursor
    this.playerContainer.style.cursor = 'default';
    
    // Clear existing timeouts
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    if (this.cursorTimeout) {
      clearTimeout(this.cursorTimeout);
    }
    
    // Only auto-hide if video is playing
    if (this.isPlaying) {
      // Hide controls after 3 seconds of no mouse movement
      this.controlsTimeout = setTimeout(() => {
        this.hideControls();
      }, 3000);
      
      // Hide cursor after 2 seconds of no mouse movement
      this.cursorTimeout = setTimeout(() => {
        this.playerContainer.style.cursor = 'none';
      }, 2000);
    }
  }

  /**
   * Hide controls
   */
  hideControls() {
    // Only hide if playing
    if (this.isPlaying) {
      this.playerContainer.classList.remove('show-controls');
      this.playerContainer.style.cursor = 'none';
    }
    
    // Clear timeouts
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
      this.controlsTimeout = null;
    }
    if (this.cursorTimeout) {
      clearTimeout(this.cursorTimeout);
      this.cursorTimeout = null;
    }
  }

  skip(seconds) {
    const newTime = this.video.currentTime + seconds;
    this.seekToTime(newTime);

    // Show seek indicator
    this.showSeekIndicator(seconds);
  }

  showSeekIndicator(seconds) {
    // Create indicator if doesn't exist
    let indicator = document.querySelector(
      `.seek-indicator.${seconds < 0 ? "left" : "right"}`
    );
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = `seek-indicator ${seconds < 0 ? "left" : "right"}`;
      this.playerContainer.appendChild(indicator);
    }

    indicator.textContent = `${seconds > 0 ? "+" : ""}${seconds}s`;
    indicator.classList.remove("active");
    void indicator.offsetWidth; // Force reflow
    indicator.classList.add("active");
  }

  seek(e) {
    const rect = this.progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(1, pos));
    this.seekToTime(clampedPos * this.video.duration);
  }

  seekToTime(targetTime) {
    if (!this.video.duration) return;

    // Check if target is within buffered range
    const isBuffered = this.isTimeBuffered(targetTime);

    if (!isBuffered) {
      // Show loading indicator for unbuffered seek
      this.showLoading();

      const timeStr = this.formatTime(targetTime);

      if (this.supportsRangeRequests === false) {
        console.warn(
          `⚠️ Seeking to ${timeStr} - server may not support Range requests`
        );
      } else {
        console.log(
          `🎯 Seeking to ${timeStr} - requesting chunk via HTTP Range header`
        );
      }

      // For Google URLs, add a note
      const isGoogleUrl = this.currentUrl.includes("googleusercontent.com");
      if (isGoogleUrl && !isBuffered) {
        console.log(
          `📥 Note: Google URLs support seeking, but may expire soon`
        );
      }
    }

    this.video.currentTime = Math.max(
      0,
      Math.min(targetTime, this.video.duration)
    );
  }

  isTimeBuffered(time) {
    for (let i = 0; i < this.video.buffered.length; i++) {
      if (
        time >= this.video.buffered.start(i) &&
        time <= this.video.buffered.end(i)
      ) {
        return true;
      }
    }
    return false;
  }

  // Seek to a specific percentage (0-100)
  seekToPercent(percent) {
    if (!this.video.duration) return;
    const targetTime = (percent / 100) * this.video.duration;
    this.seekToTime(targetTime);
  }

  // Time input methods
  showTimeInput() {
    this.timeDisplay.style.display = "none";
    this.timeInputWrapper.style.display = "flex";
    this.timeInput.value = "";
    this.timeInput.placeholder = this.formatTime(this.video.currentTime);
    this.timeInput.focus();
  }

  hideTimeInput() {
    this.timeInputWrapper.style.display = "none";
    this.timeDisplay.style.display = "";
  }

  jumpToInputTime() {
    const input = this.timeInput.value.trim();
    if (!input) {
      this.hideTimeInput();
      return;
    }

    const seconds = this.parseTimeInput(input);
    if (seconds !== null && seconds >= 0 && seconds <= this.video.duration) {
      this.seekToTime(seconds);
      this.hideTimeInput();
    } else {
      // Invalid input - shake the input
      this.timeInput.style.animation = "shake 0.3s ease";
      setTimeout(() => {
        this.timeInput.style.animation = "";
      }, 300);
    }
  }

  parseTimeInput(input) {
    // Support formats: "1:30", "1:30:00", "90", "1h30m", "90s"
    input = input.toLowerCase().trim();

    // Try HH:MM:SS or MM:SS format
    if (input.includes(":")) {
      const parts = input.split(":").map((p) => parseInt(p) || 0);
      if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }

    // Try human readable format: 1h30m, 90s, 1h, 30m
    let totalSeconds = 0;
    const hourMatch = input.match(/(\d+)\s*h/);
    const minMatch = input.match(/(\d+)\s*m/);
    const secMatch = input.match(/(\d+)\s*s/);

    if (hourMatch || minMatch || secMatch) {
      if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
      if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
      if (secMatch) totalSeconds += parseInt(secMatch[1]);
      return totalSeconds;
    }

    // Try plain number (seconds)
    const num = parseInt(input);
    if (!isNaN(num)) {
      return num;
    }

    return null;
  }

  updateTooltip(e) {
    const rect = this.progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(1, pos));
    const time = clampedPos * this.video.duration;

    this.progressTooltip.textContent = this.formatTime(time);
    this.progressTooltip.style.left = `${clampedPos * 100}%`;
  }

  updateProgress() {
    if (!this.video.duration) return;

    const progress = (this.video.currentTime / this.video.duration) * 100;
    this.progressPlayed.style.width = `${progress}%`;
    this.progressThumb.style.left = `${progress}%`;
    this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
  }

  updateBuffer() {
    if (!this.video.duration || this.video.buffered.length === 0) return;

    const duration = this.video.duration;
    const currentTime = this.video.currentTime;
    const now = Date.now();

    // Track max watched position for history buffer calculation
    if (currentTime > this.maxWatchedPosition) {
      this.maxWatchedPosition = currentTime;
    }

    // Collect all buffer ranges
    this.bufferRanges = [];
    for (let i = 0; i < this.video.buffered.length; i++) {
      this.bufferRanges.push({
        start: this.video.buffered.start(i),
        end: this.video.buffered.end(i),
      });
    }

    // Find buffer range containing current time
    let currentBufferEnd = currentTime;
    let currentBufferStart = currentTime;
    for (const range of this.bufferRanges) {
      if (currentTime >= range.start && currentTime <= range.end) {
        currentBufferEnd = range.end;
        currentBufferStart = range.start;
        break;
      }
    }

    // Calculate buffer ahead (from current position)
    const bufferAhead = currentBufferEnd - currentTime;

    // Calculate history buffer (from start of current buffer range)
    const historyBuffer = currentTime - currentBufferStart;

    // Calculate total buffered seconds
    let totalBuffered = 0;
    for (const range of this.bufferRanges) {
      totalBuffered += range.end - range.start;
    }

    // Update visual buffer bar - show the continuous buffer range around current position
    const bufferStartPercent = (currentBufferStart / duration) * 100;
    const bufferEndPercent = (currentBufferEnd / duration) * 100;

    this.progressBuffer.style.left = `${bufferStartPercent}%`;
    this.progressBuffer.style.width = `${
      bufferEndPercent - bufferStartPercent
    }%`;

    // Update stats display
    const aheadSeconds = Math.round(bufferAhead);
    this.bufferPercent.textContent = `${aheadSeconds}s ahead`;

    // Calculate real-time network speed using rolling average
    this.calculateNetworkSpeed(totalBuffered, now);
  }

  calculateNetworkSpeed(totalBuffered, now) {
    // Initialize on first call
    if (this.lastBufferTime === 0) {
      this.lastBufferTime = now;
      this.lastBufferedAmount = totalBuffered;
      return;
    }

    // Calculate speed based on buffer change over time
    const timeDelta = (now - this.lastBufferTime) / 1000; // seconds
    const bufferDelta = totalBuffered - this.lastBufferedAmount; // seconds of video

    if (timeDelta > 0.3) {
      // Update every 300ms minimum
      // Estimate bitrate: assume average video bitrate
      // For typical HD video: ~5 Mbps, 4K: ~15 Mbps, SD: ~2 Mbps
      const estimatedBitrate = 5000000; // 5 Mbps default assumption

      // bytes downloaded = seconds of video * (bitrate / 8)
      const bytesDownloaded = bufferDelta * (estimatedBitrate / 8);
      const speedBps = bytesDownloaded / timeDelta; // bytes per second

      if (bufferDelta > 0.1) {
        // Add to rolling average
        this.networkSpeedSamples.push(speedBps);
        if (this.networkSpeedSamples.length > this.maxSpeedSamples) {
          this.networkSpeedSamples.shift();
        }

        // Calculate average speed
        const avgSpeed =
          this.networkSpeedSamples.reduce((a, b) => a + b, 0) /
          this.networkSpeedSamples.length;
        this.displayNetworkSpeed(avgSpeed);
      } else if (timeDelta > 2) {
        // No recent buffering activity
        const isFullyBuffered = totalBuffered >= this.video.duration - 1;
        if (isFullyBuffered) {
          this.networkSpeed.textContent = "Complete";
          this.networkSpeed.style.color = "var(--accent-primary)";
        } else {
          this.networkSpeed.textContent = "Waiting...";
          this.networkSpeed.style.color = "var(--text-tertiary)";
        }
      }

      // Update tracking
      this.lastBufferTime = now;
      this.lastBufferedAmount = totalBuffered;
    }
  }

  displayNetworkSpeed(bytesPerSecond) {
    this.networkSpeed.style.color = ""; // Reset to default color

    if (bytesPerSecond >= 1000000) {
      this.networkSpeed.textContent = `${(bytesPerSecond / 1000000).toFixed(
        1
      )} MB/s`;
    } else if (bytesPerSecond >= 1000) {
      this.networkSpeed.textContent = `${(bytesPerSecond / 1000).toFixed(
        0
      )} KB/s`;
    } else if (bytesPerSecond > 0) {
      this.networkSpeed.textContent = `${Math.round(bytesPerSecond)} B/s`;
    }
  }

  // Update speed status when not actively buffering
  updateSpeedStatus() {
    if (!this.video.duration) return;

    // Calculate total buffered
    let totalBuffered = 0;
    for (let i = 0; i < this.video.buffered.length; i++) {
      totalBuffered +=
        this.video.buffered.end(i) - this.video.buffered.start(i);
    }

    const isFullyBuffered = totalBuffered >= this.video.duration - 1;
    const bufferPercent = Math.round(
      (totalBuffered / this.video.duration) * 100
    );

    // Update based on current state
    if (isFullyBuffered) {
      this.networkSpeed.textContent = "Complete";
      this.networkSpeed.style.color = "var(--accent-primary)";
      this.bufferIndicator.classList.remove("active");
    } else if (this.networkSpeedSamples.length === 0) {
      // No speed data yet, show buffer progress
      this.networkSpeed.textContent = `${bufferPercent}% loaded`;
      this.networkSpeed.style.color = "";
    }
  }

  // Smart buffer management - continues buffering when paused
  startBufferManagement() {
    // Clear any existing interval
    if (this.bufferCheckInterval) {
      clearInterval(this.bufferCheckInterval);
    }

    // Check buffer status every 500ms
    this.bufferCheckInterval = setInterval(() => {
      this.manageBuffer();
    }, 500);
  }

  stopBufferManagement() {
    if (this.bufferCheckInterval) {
      clearInterval(this.bufferCheckInterval);
      this.bufferCheckInterval = null;
    }
  }

  manageBuffer() {
    if (!this.video.duration || !this.video.src) return;

    const currentTime = this.video.currentTime;
    const duration = this.video.duration;

    // Calculate required history buffer (10% of max watched position)
    const requiredHistoryBuffer =
      this.maxWatchedPosition * this.historyBufferRatio;

    // Find current buffer range
    let bufferAhead = 0;
    let bufferBehind = 0;
    let totalBuffered = 0;

    for (let i = 0; i < this.video.buffered.length; i++) {
      const start = this.video.buffered.start(i);
      const end = this.video.buffered.end(i);
      totalBuffered += end - start;

      if (currentTime >= start && currentTime <= end) {
        bufferAhead = end - currentTime;
        bufferBehind = currentTime - start;
      }
    }

    // Check if still buffering (not fully loaded)
    const isFullyBuffered = totalBuffered >= duration - 0.5;
    const needsMoreBuffer =
      bufferAhead < this.targetBufferAhead && !isFullyBuffered;

    // Show buffer indicator when paused and still buffering
    if (
      this.video.paused &&
      needsMoreBuffer &&
      !this.loadingOverlay.classList.contains("active")
    ) {
      this.bufferIndicator.classList.add("active");
      this.encourageBuffering();
    } else {
      this.bufferIndicator.classList.remove("active");
    }

    // Update UI with buffer health indicator
    this.updateBufferHealth(bufferAhead, bufferBehind, requiredHistoryBuffer);

    // Update speed status display
    this.updateSpeedStatus();
  }

  encourageBuffering() {
    // Browsers automatically buffer when video is loaded
    // We ensure preload is set to auto for aggressive buffering
    if (this.video.preload !== "auto") {
      this.video.preload = "auto";
    }

    // Some browsers buffer more when we access buffered property
    // This is a hint to the browser that we care about buffering
    if (this.video.buffered.length > 0) {
      const lastBufferedEnd = this.video.buffered.end(
        this.video.buffered.length - 1
      );
      // Log buffer status for debugging
      console.debug(
        `Buffer: ${lastBufferedEnd.toFixed(1)}s / ${this.video.duration.toFixed(
          1
        )}s`
      );
    }
  }

  updateBufferHealth(ahead, behind, requiredHistory) {
    // Visual indicator of buffer health
    const bufferStat = document.getElementById("bufferStat");

    if (ahead >= 30) {
      bufferStat.classList.remove("warning", "critical");
      bufferStat.classList.add("healthy");
    } else if (ahead >= 10) {
      bufferStat.classList.remove("healthy", "critical");
      bufferStat.classList.add("warning");
    } else {
      bufferStat.classList.remove("healthy", "warning");
      bufferStat.classList.add("critical");
    }
  }

  toggleMute() {
    if (this.video.muted) {
      this.video.muted = false;
      this.video.volume = this.lastVolume || 1;
    } else {
      this.lastVolume = this.video.volume;
      this.video.muted = true;
    }
  }

  setVolume(value) {
    this.video.volume = value;
    this.video.muted = value == 0;
    this.updateVolumeUI();
  }

  updateVolumeUI() {
    const volume = this.video.muted ? 0 : this.video.volume;
    
    // Update slider value
    if (this.volumeSlider) {
        this.volumeSlider.value = volume;
        
        // Update CSS variable if needed for specific browser tricks, 
        // but the box-shadow trick works automatically with native value in most cases 
        // or requires no JS updates if configured correctly for simple inputs.
        // Actually, for the box-shadow trick to check "fill", it works natively with the thumb position.
    }
  }

  setPlaybackSpeed(speed) {
    try {
      this.video.playbackRate = speed;
      this.speedValue.textContent = `${speed}x`;

      document.querySelectorAll(".speed-option").forEach((option) => {
        option.classList.toggle(
          "active",
          parseFloat(option.dataset.speed) === speed
        );
      });

      this.speedMenu.classList.remove("active");
    } catch (error) {
      // Browser doesn't support this playback rate
      console.warn(`Playback rate ${speed}x not supported:`, error.message);
      this.showSpeedWarning(speed);
    }
  }

  showSpeedWarning(speed) {
    // Show temporary warning
    const warning = document.createElement("div");
    warning.className = "speed-warning";
    warning.innerHTML = `⚠️ ${speed}x not supported. Browser limit: 0.0625x - 16x`;

    this.playerContainer.appendChild(warning);

    setTimeout(() => {
      warning.classList.add("fade-out");
      setTimeout(() => warning.remove(), 300);
    }, 2500);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (this.playerContainer.requestFullscreen) {
        this.playerContainer.requestFullscreen();
      } else if (this.playerContainer.webkitRequestFullscreen) {
        this.playerContainer.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  onFullscreenChange() {
    this.isFullscreen = !!(
      document.fullscreenElement || document.webkitFullscreenElement
    );
    this.playerContainer.classList.toggle("fullscreen", this.isFullscreen);
  }

  async togglePiP() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await this.video.requestPictureInPicture();
      }
    } catch (e) {
      console.error("PiP error:", e);
    }
  }

  showControls() {
    clearTimeout(this.controlsTimeout);
    clearTimeout(this.cursorTimeout);

    this.playerContainer.classList.add("show-controls");
    this.playerContainer.classList.remove("hide-cursor");

    if (this.isPlaying) {
      this.controlsTimeout = setTimeout(() => {
        this.playerContainer.classList.remove("show-controls");
      }, 3000);

      if (this.isFullscreen) {
        this.cursorTimeout = setTimeout(() => {
          this.playerContainer.classList.add("hide-cursor");
        }, 3000);
      }
    }
  }

  hideControls() {
    if (this.isPlaying) {
      this.playerContainer.classList.remove("show-controls");
    }
  }

  handleKeyboard(e) {
    // Don't handle if typing in input
    if (e.target.tagName === "INPUT") return;

    const key = e.key.toLowerCase();

    switch (key) {
      case " ":
      case "k":
        e.preventDefault();
        if (this.playerSection.classList.contains("active")) {
          this.togglePlay();
        }
        break;
      case "f":
        e.preventDefault();
        this.toggleFullscreen();
        break;
      case "m":
        e.preventDefault();
        this.toggleMute();
        break;
      case "p":
        e.preventDefault();
        this.togglePiP();
        break;
      case "q":
        e.preventDefault();
        this.qualityMenu.classList.toggle("active");
        break;
      case "arrowleft":
      case "j":
        e.preventDefault();
        this.skip(-10);
        break;
      case "arrowright":
      case "l":
        e.preventDefault();
        this.skip(10);
        break;
      case "arrowup":
        e.preventDefault();
        this.setVolume(Math.min(1, this.video.volume + 0.1));
        break;
      case "arrowdown":
        e.preventDefault();
        this.setVolume(Math.max(0, this.video.volume - 0.1));
        break;
      case "?":
        e.preventDefault();
        this.shortcutsModal.classList.toggle("active");
        break;
      case "escape":
        this.shortcutsModal.classList.remove("active");
        break;
      default:
        // Number keys for seeking (0-9 = 0%-90%)
        if (key >= "0" && key <= "9") {
          e.preventDefault();
          const percent = parseInt(key) * 10;
          this.seekToPercent(percent);
        }
    }
  }

  showLoading() {
    this.loadingOverlay.classList.add("active");
  }

  hideLoading() {
    this.loadingOverlay.classList.remove("active");
  }

  showError(message = "Unable to load video") {
    this.hideLoading();
    this.errorText.textContent = message;
    this.errorOverlay.classList.add("active");
  }

  hideError() {
    this.errorOverlay.classList.remove("active");
  }

  handleError(e) {
    const error = this.video.error;
    let message = "Unable to load video";

    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          message = "Video playback aborted";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          message =
            "Network error - check your connection or the URL may have expired";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          message = "Video format not supported by browser";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          // Try without crossorigin attribute if it was set
          if (
            this.video.hasAttribute("crossorigin") &&
            !this.triedWithoutCors
          ) {
            this.triedWithoutCors = true;
            console.log("Retrying without CORS...");
            this.video.removeAttribute("crossorigin");
            this.video.load();
            return;
          }
          // Try with crossorigin if it wasn't set
          if (!this.video.hasAttribute("crossorigin") && !this.triedWithCors) {
            this.triedWithCors = true;
            console.log("Retrying with CORS anonymous...");
            this.video.setAttribute("crossorigin", "anonymous");
            this.video.load();
            return;
          }

          // Check if it's a Google URL for specific message
          const isGoogleUrl =
            this.currentUrl.includes("googleusercontent.com") ||
            this.currentUrl.includes("googlevideo.com");
          if (isGoogleUrl) {
            message =
              "Google video URL has expired!\n\nGoogle download links are only valid for a few hours.\nPlease get a fresh download URL.";
          } else {
            message =
              "Video cannot be played.\n\n• URL may be expired or invalid\n• Server may block external access\n• Format may not be supported";
          }
          break;
      }
    }

    this.showError(message);
  }

  showPlayerSection() {
    this.urlSection.classList.add("hidden");
    this.urlSection.style.display = 'none';
    
    // Hide Library
    const libSec = document.getElementById('librarySection');
    if(libSec) {
        libSec.classList.add('hidden');
        libSec.style.display = 'none';
    }

    this.playerSection.classList.add("active");
    this.playerSection.style.display = '';

    // Update Button to "Library"
    const btn = document.getElementById('libraryNavBtn');
    if(btn) {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>Library</span>
        `;
    }
  }

  showLibrarySection() {
      // Hide other sections
      if(this.urlSection) {
          this.urlSection.classList.add('hidden');
          this.urlSection.style.display = 'none';
      }
      if(this.playerSection) {
          this.playerSection.classList.remove('active');
          this.playerSection.style.display = 'none';
      }
      
      // Show library
      const libSec = document.getElementById('librarySection');
      if(libSec) {
          libSec.classList.remove('hidden');
          libSec.style.display = 'block';
      }
      
      // Update Button to "Home"
      const btn = document.getElementById('libraryNavBtn');
      if(btn) {
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Home</span>
          `;
      }
      
      this.hideError();
  }

  setupWheelControls() {
    this.playerContainer.addEventListener('wheel', (e) => {
        if (!this.playerSection.classList.contains('active')) return;
        e.preventDefault();
        
        if (e.deltaY < 0) {
            // Volume up or scroll up progress
            if (e.shiftKey) this.skip(5);
            else this.setVolume(Math.min(1, this.video.volume + 0.05));
        } else {
            // Volume down or scroll down progress
            if (e.shiftKey) this.skip(-5);
            else this.setVolume(Math.max(0, this.video.volume - 0.05));
        }
    }, { passive: false });
  }

  setupGestures() {
    let lastTap = 0;
    this.video.addEventListener('touchstart', (e) => {
        const now = Date.now();
        const tapDelay = now - lastTap;
        if (tapDelay < 300 && tapDelay > 0) {
            const touchX = e.touches[0].clientX;
            const screenWidth = window.innerWidth;
            if (touchX < screenWidth / 3) {
                this.skip(-10);
            } else if (touchX > (screenWidth * 2) / 3) {
                this.skip(10);
            }
        }
        lastTap = now;
    });

    // Double click on sides
    this.playerContainer.addEventListener('dblclick', (e) => {
        const rect = this.playerContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 4) {
            this.skip(-10);
        } else if (x > (rect.width * 3) / 4) {
            this.skip(10);
        }
    });
  }

  // History methods moved to HomeManager

  /**
   * Save current playback position
   */
  savePlaybackPosition(url, time) {
    const positions = JSON.parse(localStorage.getItem('vayu_playback_positions') || '{}');
    positions[url] = {
        time: time,
        timestamp: Date.now()
    };
    this.safeLocalStorageSet('vayu_playback_positions', JSON.stringify(positions));
  }

  /**
   * Get saved playback position for URL
   */
  getPlaybackPosition(url) {
    const positions = JSON.parse(localStorage.getItem('vayu_playback_positions') || '{}');
    return positions[url]?.time || 0;
  }

  /**
   * Clear playback position when video completes
   */
  clearPlaybackPosition(url) {
    const positions = JSON.parse(localStorage.getItem('vayu_playback_positions') || '{}');
    delete positions[url];
    this.safeLocalStorageSet('vayu_playback_positions', JSON.stringify(positions));
  }

  showUrlSection() {
    this.urlSection.classList.remove("hidden");
    this.urlSection.style.display = ''; 
    this.playerSection.classList.remove("active");

    const libSec = document.getElementById('librarySection');
    if(libSec) {
        libSec.classList.add('hidden');
        libSec.style.display = 'none';
    }

    // Update Button to "Library"
    const btn = document.getElementById('libraryNavBtn');
    if(btn) {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>Library</span>
        `;
    }

    // Stop buffer management
    this.stopBufferManagement();

    // Reset video
    this.video.pause();
    this.video.src = "";
    this.video.load();

    // Reset buffer tracking
    this.maxWatchedPosition = 0;
    this.bufferRanges = [];
    this.lastBufferTime = 0;
    this.lastBufferedAmount = 0;
    this.networkSpeedSamples = [];

    // Reset UI
    this.hideLoading();
    this.hideError();
    this.progressPlayed.style.width = "0%";
    this.progressBuffer.style.width = "0%";
    this.progressBuffer.style.left = "0%";
    this.progressThumb.style.left = "0%";
    this.currentTimeEl.textContent = "0:00";
    this.durationEl.textContent = "0:00";
    this.bufferPercent.textContent = "0%";
    this.networkSpeed.textContent = "—";

    // Remove buffer health classes
    const bufferStat = document.getElementById("bufferStat");
    bufferStat.classList.remove("healthy", "warning", "critical");

    // Hide buffer indicator
    this.bufferIndicator.classList.remove("active");

    // Clear URL params
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("url");
    window.history.replaceState({}, "", newUrl);

    this.urlInput.focus();
  }

  formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  // --- CAPTION LOGIC ---

  setupCaptions() {
    this.captionSettingsModal = document.getElementById("captionSettingsModal");
    this.closeCaptionSettingsBtn = document.getElementById("closeCaptionSettings");
    this.captionTrackSelect = document.getElementById("captionTrackSelect");
    this.captionSize = document.getElementById("captionSize");
    this.captionSizeVal = document.getElementById("captionSizeVal");
    this.captionColors = document.getElementById("captionColors");
    this.captionBgOpacity = document.getElementById("captionBgOpacity");
    this.captionBgVal = document.getElementById("captionBgVal");
    this.captionVertical = document.getElementById("captionVertical");
    this.captionVerticalVal = document.getElementById("captionVerticalVal");
    this.captionHorizontal = document.getElementById("captionHorizontal");
    this.captionHorizontalVal = document.getElementById("captionHorizontalVal");
    this.ccBtn = document.getElementById("ccBtn");
    this.toastNotification = document.getElementById("toastNotification");
    this.subtitleFileInput = document.getElementById("subtitleFileInput");
    this.subtitleUploadBtn = document.getElementById("subtitleUploadBtn");
    this.subtitleFileName = document.getElementById("subtitleFileName");
    this.customCaptionContainer = document.getElementById("customCaptionContainer");
    this.customCaptionText = document.getElementById("customCaptionText");

    // Hover support for CC Button
    let hoverTimeout;
    
    const showSettings = () => {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            this.openCaptionSettings();
        }, 300); // 300ms delay before showing
    };

    const hideSettings = () => {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            this.captionSettingsModal.classList.remove("active");
        }, 200); // 200ms delay before hiding
    };

    this.ccBtn.addEventListener("mouseenter", showSettings);
    this.ccBtn.addEventListener("mouseleave", hideSettings);
    
    // Also keep open when hovering the modal itself
    this.captionSettingsModal.addEventListener("mouseenter", () => {
        clearTimeout(hoverTimeout);
    });
    
    this.captionSettingsModal.addEventListener("mouseleave", hideSettings);

    // Keep click for mobile / manual toggle if needed, or just let hover handle it.
    // User requested "on hover", but click is good backup for touch.
    this.ccBtn.addEventListener("click", (e) => {
        // Prevent double fire if hover already handled, or toggle if needed.
        // For simplicity, just ensure it's open.
        showSettings();
    });

    this.closeCaptionSettingsBtn.addEventListener("click", () => {
        this.captionSettingsModal.classList.remove("active");
    });

    // Track Selection
    this.captionTrackSelect.addEventListener("change", (e) => {
        this.setTrack(e.target.value);
    });

    // Styling Inputs
    this.captionSize.addEventListener("input", (e) => this.updateCaptionStyle("size", e.target.value));
    this.captionBgOpacity.addEventListener("input", (e) => this.updateCaptionStyle("bg", e.target.value));
    this.captionVertical.addEventListener("input", (e) => this.updateCaptionStyle("vertical", e.target.value));
    this.captionHorizontal.addEventListener("input", (e) => this.updateCaptionStyle("horizontal", e.target.value));
    
    // Colors
    this.captionColors.querySelectorAll(".color-opt").forEach(btn => {
        btn.addEventListener("click", () => {
            this.captionColors.querySelectorAll(".color-opt").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            this.updateCaptionStyle("color", btn.dataset.color);
        });
    });

    // Subtitle File Upload
    this.subtitleUploadBtn.addEventListener("click", () => {
        this.subtitleFileInput.click();
    });

    this.subtitleFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            this.loadSubtitleFile(file);
        }
    });

    // Detect new tracks
    this.video.textTracks.addEventListener("addtrack", () => this.updateTrackList());
    
    // Load saved perfs
    this.loadCaptionPreferences();
  }

  loadSubtitleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        let content = e.target.result;
        const fileName = file.name;
        
        // Convert SRT to VTT if needed
        if (fileName.endsWith('.srt')) {
            content = this.srtToVtt(content);
        }
        
        // Remove any existing custom track
        const existingTrack = this.video.querySelector('track[data-custom="true"]');
        if (existingTrack) {
            existingTrack.remove();
        }
        
        // Create a blob URL for the VTT content
        const blob = new Blob([content], { type: 'text/vtt' });
        const url = URL.createObjectURL(blob);
        
        // Add track element to video
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = fileName.replace(/\.(srt|vtt)$/i, '');
        track.srclang = 'en';
        track.src = url;
        track.dataset.custom = 'true';
        track.default = true;
        
        this.video.appendChild(track);
        
        // Enable the track and set up cue change listener for custom overlay
        setTimeout(() => {
            const textTrack = this.video.textTracks[this.video.textTracks.length - 1];
            textTrack.mode = 'hidden'; // Hide native, use custom overlay
            
            // Listen for cue changes to update custom overlay
            textTrack.oncuechange = () => {
                const activeCues = textTrack.activeCues;
                if (activeCues && activeCues.length > 0) {
                    const cueText = Array.from(activeCues).map(c => c.text).join('\n');
                    this.customCaptionText.textContent = cueText;
                    this.customCaptionText.classList.add('active');
                } else {
                    this.customCaptionText.classList.remove('active');
                }
            };
            
            this.activeTextTrack = textTrack;
            this.updateTrackList();
            this.ccBtn.classList.add('active');
            this.showToast('Subtitles loaded: ' + fileName);
            this.subtitleFileName.textContent = fileName;
        }, 100);
    };
    reader.readAsText(file);
  }

  srtToVtt(srt) {
    // Convert SRT format to WebVTT
    let vtt = 'WEBVTT\n\n';
    
    // Replace SRT timecodes (comma) with VTT timecodes (period)
    // SRT: 00:00:01,000 --> 00:00:04,000
    // VTT: 00:00:01.000 --> 00:00:04.000
    const lines = srt.split('\n');
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Replace comma with period in timestamps
        if (line.includes(' --> ')) {
            line = line.replace(/,/g, '.');
        }
        
        // Skip sequence numbers (just digits)
        if (/^\d+$/.test(line)) {
            continue;
        }
        
        result.push(line);
    }
    
    return vtt + result.join('\n');
  }

  updateTrackList() {
    const tracks = Array.from(this.video.textTracks);
    this.captionTrackSelect.innerHTML = '<option value="off">Off</option>';
    
    // Always show button
    this.ccBtn.style.display = "flex";

    if (tracks.length > 0) {
        tracks.forEach((track, index) => {
            const opt = document.createElement("option");
            opt.value = index;
            opt.textContent = track.label || track.language || `Track ${index + 1}`;
            this.captionTrackSelect.appendChild(opt);
        });
    }
  }

  setTrack(index) {
    // Handle HLS tracks
    if (typeof index === 'string' && index.startsWith('hls-')) {
        const hlsIndex = parseInt(index.replace('hls-', ''));
        this.setHLSTrack(hlsIndex);
        localStorage.setItem("vayu_caption_track", index);
        return;
    }

    // Handle native textTracks
    const tracks = Array.from(this.video.textTracks);
    tracks.forEach(t => t.mode = "hidden"); // Hide all first
    
    if (index !== "off" && tracks[index]) {
        tracks[index].mode = "showing";
        this.ccBtn.classList.add("active");
    } else {
        this.ccBtn.classList.remove("active");
        // Also disable HLS subtitles if any
        if (this.hlsInstance) {
            this.hlsInstance.subtitleTrack = -1;
        }
    }
    localStorage.setItem("vayu_caption_track", index);
  }

  openCaptionSettings() {
    this.updateTrackList(); // Refresh list
    // Set current value
    const currentMode = Array.from(this.video.textTracks).findIndex(t => t.mode === "showing");
    this.captionTrackSelect.value = currentMode !== -1 ? currentMode : "off";
    
    this.captionSettingsModal.classList.add("active");
  }

  updateCaptionStyle(prop, value) {
    if (prop === "size") {
        this.customCaptionText.style.setProperty("--caption-size", `${value / 100 * 1.5}rem`);
        this.captionSizeVal.textContent = `${value}%`;
    } else if (prop === "bg") {
        this.customCaptionText.style.setProperty("--caption-bg", `rgba(0, 0, 0, ${value / 100})`);
        this.captionBgVal.textContent = `${value}%`;
    } else if (prop === "color") {
        this.customCaptionText.style.setProperty("--caption-color", value);
    } else if (prop === "vertical") {
        this.customCaptionText.style.setProperty("--caption-y", `${value}%`);
        this.captionVerticalVal.textContent = `${value}%`;
    } else if (prop === "horizontal") {
        this.customCaptionText.style.setProperty("--caption-x", `${value}%`);
        this.captionHorizontalVal.textContent = `${value}%`;
    }
    this.saveCaptionStyle();
  }

  saveCaptionStyle() {
    const style = {
        size: this.captionSize.value,
        bg: this.captionBgOpacity.value,
        color: this.captionColors.querySelector(".active")?.dataset.color || "#FFFFFF",
        vertical: this.captionVertical.value,
        horizontal: this.captionHorizontal.value
    };
    localStorage.setItem("vayu_caption_style", JSON.stringify(style));
  }

  loadCaptionPreferences() {
    // Load Style
    const savedStyle = JSON.parse(localStorage.getItem("vayu_caption_style"));
    if (savedStyle) {
        this.captionSize.value = savedStyle.size || 100;
        this.captionBgOpacity.value = savedStyle.bg || 50;
        this.captionVertical.value = savedStyle.vertical || 90;
        this.captionHorizontal.value = savedStyle.horizontal || 50;
        
        // Apply all styles
        this.updateCaptionStyle("size", savedStyle.size || 100);
        this.updateCaptionStyle("bg", savedStyle.bg || 50);
        this.updateCaptionStyle("color", savedStyle.color || "#FFFFFF");
        this.updateCaptionStyle("vertical", savedStyle.vertical || 90);
        this.updateCaptionStyle("horizontal", savedStyle.horizontal || 50);
        
        // Update UI hooks
        const colorBtn = Array.from(this.captionColors.children).find(b => b.dataset.color === savedStyle.color);
        if (colorBtn) {
            this.captionColors.querySelectorAll(".active").forEach(b => b.classList.remove("active"));
            colorBtn.classList.add("active");
        }
    }

    // Attempt to restore track (basic logic)
    // Note: Track availability depends on video load, so this might need to run after metadata loaded.
    this.video.addEventListener("loadedmetadata", () => {
         this.updateTrackList();
    });
  }

  showToast(message, duration = 2000) {
      this.toastNotification.textContent = message;
      this.toastNotification.classList.add('active');
      
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
          this.toastNotification.classList.remove('active');
      }, duration);
  }

  // --- AUDIO TRACK LOGIC ---
  
  setupAudioTracks() {
    this.audioSettingsModal = document.getElementById("audioSettingsModal");
    this.closeAudioSettingsBtn = document.getElementById("closeAudioSettings");
    this.audioTrackSelect = document.getElementById("audioTrackSelect");
    this.audioBtn = document.getElementById("audioBtn");

    // Hover support for Audio Button
    let audioHoverTimeout;
    
    const showAudioSettings = () => {
        clearTimeout(audioHoverTimeout);
        this.openAudioSettings();
    };

    const hideAudioSettings = () => {
        audioHoverTimeout = setTimeout(() => {
            this.audioSettingsModal.classList.remove("active");
        }, 300);
    };

    this.audioBtn.addEventListener("mouseenter", showAudioSettings);
    this.audioBtn.addEventListener("mouseleave", hideAudioSettings);
    
    this.audioSettingsModal.addEventListener("mouseenter", () => {
        clearTimeout(audioHoverTimeout);
    });
    
    this.audioSettingsModal.addEventListener("mouseleave", hideAudioSettings);

    this.audioBtn.addEventListener("click", () => {
        showAudioSettings();
    });

    this.closeAudioSettingsBtn.addEventListener("click", () => {
        this.audioSettingsModal.classList.remove("active");
    });

    // Track Selection
    this.audioTrackSelect.addEventListener("change", (e) => {
        this.setAudioTrack(e.target.value);
    });

    // Listen for when video loads to detect audio tracks
    this.video.addEventListener("loadedmetadata", () => {
        this.updateAudioTrackList();
    });
  }

  openAudioSettings() {
      this.updateAudioTrackList();
      this.audioSettingsModal.classList.add("active");
  }

  updateAudioTrackList() {
      // Clear existing options
      this.audioTrackSelect.innerHTML = '<option value="-1">Default</option>';
      
      // Check for HLS audio tracks first
      if (this.hlsInstance && this.hlsInstance.audioTracks && this.hlsInstance.audioTracks.length > 0) {
          this.updateHLSAudioTrackList();
          this.audioBtn.classList.add('active');
          return;
      }

      // Check for native HTML5 audio tracks
      const audioTracks = this.video.audioTracks;
      if (audioTracks && audioTracks.length > 1) {
          for (let i = 0; i < audioTracks.length; i++) {
              const track = audioTracks[i];
              const option = document.createElement('option');
              option.value = i;
              option.textContent = track.label || track.language || `Track ${i + 1}`;
              if (track.enabled) {
                  option.selected = true;
              }
              this.audioTrackSelect.appendChild(option);
          }
          this.audioBtn.classList.add('active');
      } else {
          // No audio tracks or only one
          this.audioBtn.classList.remove('active');
      }
  }

  updateHLSAudioTrackList() {
      if (!this.hlsInstance || !this.hlsInstance.audioTracks) return;

      const tracks = this.hlsInstance.audioTracks;
      this.audioTrackSelect.innerHTML = '';

      tracks.forEach((track, index) => {
          const option = document.createElement('option');
          option.value = `hls-${index}`;
          option.textContent = track.name || track.lang || `Audio ${index + 1}`;
          if (index === this.hlsInstance.audioTrack) {
              option.selected = true;
          }
          this.audioTrackSelect.appendChild(option);
      });
  }

  setAudioTrack(value) {
      // Handle HLS audio tracks
      if (value.startsWith('hls-')) {
          const trackIndex = parseInt(value.replace('hls-', ''));
          this.setHLSAudioTrack(trackIndex);
          return;
      }

      // Handle native HTML5 audio tracks
      const audioTracks = this.video.audioTracks;
      if (!audioTracks) return;

      const trackIndex = parseInt(value);
      
      // Disable all tracks first
      for (let i = 0; i < audioTracks.length; i++) {
          audioTracks[i].enabled = false;
      }

      // Enable selected track
      if (trackIndex >= 0 && trackIndex < audioTracks.length) {
          audioTracks[trackIndex].enabled = true;
          this.showToast(`Audio: ${audioTracks[trackIndex].label || audioTracks[trackIndex].language || 'Track ' + (trackIndex + 1)}`);
      }
  }

  updateSubtitleList() {
      console.log('📝 Updating subtitle list from embedded tracks...');
      
      const textTracks = this.video.textTracks;
      if (!textTracks || textTracks.length === 0) {
          console.log('No embedded subtitles found');
          return;
      }

      // Enable the caption button to show tracks are available
      const captionBtn = document.getElementById('captionBtn');
      if (captionBtn) {
          captionBtn.classList.add('active');
      }

      console.log(`Found ${textTracks.length} subtitle track(s):`);
      
      // Log all available tracks
      for (let i = 0; i < textTracks.length; i++) {
          const track = textTracks[i];
          console.log(`  - Track ${i}: ${track.label || track.language || 'Unknown'} (${track.kind})`);
          
          // Set mode to 'hidden' initially so they're loaded but not shown
          track.mode = 'hidden';
          
          // Listen for cue changes to enable custom rendering if needed
          track.addEventListener('cuechange', () => {
              if (track.mode === 'showing' && track.activeCues && track.activeCues.length > 0) {
                  // Subtitles are active
                  console.log('Active subtitle:', track.activeCues[0].text);
              }
          });
      }

      // If there's a subtitle selector in your UI, populate it
      // (You may need to add this UI element if it doesn't exist)
      this.populateSubtitleSelector(textTracks);
  }

  populateSubtitleSelector(textTracks) {
      // Check if you have a subtitle selector element
      const subtitleSelect = document.getElementById('subtitleSelect');
      if (!subtitleSelect) {
          console.log('No subtitle selector found in UI');
          return;
      }

      // Clear existing options
      subtitleSelect.innerHTML = '<option value="-1">Off</option>';

      // Add each track as an option
      for (let i = 0; i < textTracks.length; i++) {
          const track = textTracks[i];
          const option = document.createElement('option');
          option.value = i;
          option.textContent = track.label || track.language || `Subtitle ${i + 1}`;
          subtitleSelect.appendChild(option);
      }

      // Listen for selection changes
      subtitleSelect.addEventListener('change', (e) => {
          const selectedIndex = parseInt(e.target.value);
          
          // Hide all tracks
          for (let i = 0; i < textTracks.length; i++) {
              textTracks[i].mode = 'hidden';
          }

          // Show selected track
          if (selectedIndex >= 0 && selectedIndex < textTracks.length) {
              textTracks[selectedIndex].mode = 'showing';
              this.showToast(`Subtitles: ${textTracks[selectedIndex].label || textTracks[selectedIndex].language || 'On'}`);
          } else {
              this.showToast('Subtitles: Off');
          }
      });
  }

  setHLSAudioTrack(trackIndex) {
      if (!this.hlsInstance) return;

      this.hlsInstance.audioTrack = trackIndex;
      const track = this.hlsInstance.audioTracks[trackIndex];
      this.showToast(`Audio: ${track.name || track.lang || 'Track ' + (trackIndex + 1)}`);
  }

  // --- QUALITY MANAGEMENT ---
  
  /**
   * Update quality menu with available levels
   */
  updateQualityLevels(levels) {
    if (!levels || levels.length <= 1) {
      // Hide quality button if only one quality available
      this.qualityBtn.style.display = 'none';
      return;
    }

    this.qualityBtn.style.display = 'flex';
    
    // Clear existing options except Auto
    this.qualityMenu.innerHTML = '<div class="quality-option active" data-quality="-1">Auto</div>';
    
    // Add quality levels (sorted by height, highest first)
    const sortedLevels = [...levels].sort((a, b) => b.height - a.height);
    
    sortedLevels.forEach((level, index) => {
      const realIndex = levels.indexOf(level);
      const qualityLabel = this.getQualityLabel(level);
      const bitrate = (level.bitrate / 1000000).toFixed(2); // Convert to Mbps
      
      const option = document.createElement('div');
      option.className = 'quality-option';
      option.dataset.quality = realIndex;
      option.innerHTML = `
        <div class="quality-info">
          <span class="quality-label">${qualityLabel}</span>
          <span class="quality-bitrate">${bitrate} Mbps</span>
        </div>
      `;
      
      option.addEventListener('click', () => this.setQuality(realIndex));
      this.qualityMenu.appendChild(option);
    });
    
    // Update current quality display
    this.updateQualityDisplay();
  }

  /**
   * Get user-friendly quality label
   */
  getQualityLabel(level) {
    const height = level.height;
    
    if (height >= 2160) return '4K';
    if (height >= 1440) return '1440p';
    if (height >= 1080) return '1080p (Full HD)';
    if (height >= 720) return '720p (HD)';
    if (height >= 480) return '480p (SD)';
    if (height >= 360) return '360p';
    if (height >= 240) return '240p';
    return `${height}p`;
  }

  /**
   * Set video quality
   */
  setQuality(levelIndex) {
    if (!this.hlsInstance) {
      this.showToast('Quality selection only available for adaptive streams');
      return;
    }

    // -1 means Auto (adaptive)
    this.hlsInstance.currentLevel = levelIndex;
    
    // Update UI
    this.qualityMenu.querySelectorAll('.quality-option').forEach(opt => {
      opt.classList.remove('active');
      if (opt.dataset.quality == levelIndex) {
        opt.classList.add('active');
      }
    });
    
    this.updateQualityDisplay();
    this.qualityMenu.classList.remove('active');
    
    if (levelIndex === -1) {
      this.showToast('Quality: Auto (Adaptive)');
    } else {
      const level = this.hlsInstance.levels[levelIndex];
      this.showToast(`Quality: ${this.getQualityLabel(level)}`);
    }
  }

  /**
   * Update quality display on button
   */
  updateQualityDisplay() {
    if (!this.hlsInstance || !this.hlsInstance.levels) {
      this.qualityValue.textContent = 'Auto';
      return;
    }

    const currentLevel = this.hlsInstance.currentLevel;
    
    if (currentLevel === -1) {
      // Auto mode - show currently playing quality
      const loadLevel = this.hlsInstance.loadLevel;
      if (loadLevel >= 0 && this.hlsInstance.levels[loadLevel]) {
        const level = this.hlsInstance.levels[loadLevel];
        this.qualityValue.textContent = `Auto (${level.height}p)`;
      } else {
        this.qualityValue.textContent = 'Auto';
      }
    } else if (this.hlsInstance.levels[currentLevel]) {
      const level = this.hlsInstance.levels[currentLevel];
      this.qualityValue.textContent = `${level.height}p`;
    }
  }
} // End Class

  // LibraryManager removed (in sections/library/library.js)
