/**
 * VayuPlay Video Player
 * High-quality streaming video player with smart buffering
 */

class VayuPlayer {
  constructor() {
    // DOM Elements
    this.urlSection = document.getElementById("urlSection");
    this.playerSection = document.getElementById("playerSection");
    this.playerContainer = document.getElementById("playerContainer");
    this.video = document.getElementById("videoPlayer");
    this.urlInput = document.getElementById("videoUrl");
    this.loadBtn = document.getElementById("loadBtn");
    this.backBtn = document.getElementById("backBtn");
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

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupVideoEvents();
    this.setupWheelControls();
    this.setupGestures();
    this.loadHistory();
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

  bindEvents() {
    // URL Input
    this.loadBtn.addEventListener("click", () => this.loadVideo());
    this.urlInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.loadVideo();
    });
    this.backBtn.addEventListener("click", () => this.showUrlSection());
    this.retryBtn.addEventListener("click", () => this.loadVideo());

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
    });

    this.video.addEventListener("pause", () => {
      this.isPlaying = false;
      this.playerContainer.classList.remove("playing");
      // Continue buffering even when paused - browser handles this
      // but we update the UI to show buffer progress
      this.updateBuffer();
    });

    this.video.addEventListener("ended", () => {
      this.isPlaying = false;
      this.playerContainer.classList.remove("playing");
      this.playOverlay.classList.remove("hidden");
    });

    // Time update
    this.video.addEventListener("timeupdate", () => {
      this.updateProgress();
      // Track max watched position for history buffer
      if (this.video.currentTime > this.maxWatchedPosition) {
        this.maxWatchedPosition = this.video.currentTime;
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

    // Check if proxy should be used
    const useProxy = this.useProxyCheckbox && this.useProxyCheckbox.checked;
    if (useProxy) {
      // Use local proxy server (run server.js with node)
      url = `http://localhost:4000/proxy?url=${encodeURIComponent(url)}`;
      console.log("🔄 Using local proxy server for URL");
    }

    this.currentUrl = url;
    this.originalUrl = this.urlInput.value.trim(); // Store original for display
    this.hideError();
    this.showPlayerSection();
    this.showLoading();
    this.saveToHistory(this.originalUrl);

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
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("url", encodeURIComponent(url));
    window.history.replaceState({}, "", newUrl);
  }

  async loadDirectVideo(url) {
    // Reset video element for fresh load
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();

    // Configure for streaming
    this.video.preload = "auto";

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
    this.playerSection.classList.add("active");
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

  saveToHistory(url) {
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
    localStorage.setItem('vayu_player_history', JSON.stringify(history));
    this.renderHistory();
  }

  loadHistory() {
    this.renderHistory();
  }

  renderHistory() {
    const history = JSON.parse(localStorage.getItem('vayu_player_history') || '[]');
    if (history.length === 0) {
        this.recentSection.style.display = 'none';
        return;
    }

    this.recentSection.style.display = 'block';
    this.recentList.innerHTML = history.map(item => `
        <div class="recent-item" data-url="${item.url}">
            <div class="recent-thumbnail">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M2 12h20" opacity="0.1"/>
                    <path d="M8 5v14l11-7-11-7z" fill="currentColor"/>
                </svg>
            </div>
            <div class="recent-info">
                <div class="recent-url">${this.truncateUrl(item.url)}</div>
                <div class="recent-date">${new Date(item.timestamp).toLocaleDateString()}</div>
            </div>
        </div>
    `).join('');

    this.recentList.querySelectorAll('.recent-item').forEach(el => {
        el.addEventListener('click', () => {
            this.urlInput.value = el.dataset.url;
            this.loadVideo();
        });
    });
  }

  truncateUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname + u.pathname;
    } catch (e) {
        return url;
    }
  }

  clearHistory() {
    localStorage.removeItem('vayu_player_history');
    this.renderHistory();
  }

  showUrlSection() {
    this.urlSection.classList.remove("hidden");
    this.playerSection.classList.remove("active");

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
        this.openCaptionSettings();
    };

    const hideSettings = () => {
        hoverTimeout = setTimeout(() => {
            this.captionSettingsModal.classList.remove("active");
        }, 300); // Small delay to allow moving mouse to modal
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

  setHLSAudioTrack(trackIndex) {
      if (!this.hlsInstance) return;

      this.hlsInstance.audioTrack = trackIndex;
      const track = this.hlsInstance.audioTracks[trackIndex];
      this.showToast(`Audio: ${track.name || track.lang || 'Track ' + (trackIndex + 1)}`);
  }
} // End Class

// Initialize player when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.vayuPlayer = new VayuPlayer();
  // Init captions and audio tracks
  window.vayuPlayer.setupCaptions();
  window.vayuPlayer.setupAudioTracks();
});

// Service Worker for offline support (optional enhancement)
if ("serviceWorker" in navigator) {
  // Uncomment to enable service worker
  // navigator.serviceWorker.register('/sw.js');
}
