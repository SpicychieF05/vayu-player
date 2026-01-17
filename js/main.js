import { VayuPlayer } from '../sections/player/player.js';
import { HomeManager } from '../sections/home/home.js';
import { LibraryManager } from '../sections/library/library.js';

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Player
  const player = new VayuPlayer();
  // Expose to window for debugging or legacy external scripts
  window.vayuPlayer = player;
  
  // Initialize Home & History Manager
  const homeManager = new HomeManager(player);
  // Attach homeManager to player if needed (e.g. for access from player logic)
  player.homeManager = homeManager;

  // Initialize Library Manager
  const libraryManager = new LibraryManager(player);
  player.library = libraryManager;

  // Init captions and audio tracks
  if(player.setupCaptions) player.setupCaptions();
  if(player.setupAudioTracks) player.setupAudioTracks();
  
  // Service Worker
  if ("serviceWorker" in navigator) {
      // navigator.serviceWorker.register('/sw.js');
  }
});
