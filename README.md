# 🎬 V A Y U &nbsp; P L A Y E R

<div align="center">

![Badge](https://img.shields.io/badge/Experience-Cinematic-0A84FF?style=for-the-badge&logoColor=white)
![Badge](https://img.shields.io/badge/Design-Premium%20Dark-000000?style=for-the-badge)
![Badge](https://img.shields.io/badge/Deploy-Vercel%20Ready-success?style=for-the-badge)

_Experience the future of web streaming. Immersive. Elegant. Powerful._

― 🌫️ ―

</div>

---

## 🌌 Overview

**Vayu Player** isn't just a video player; it's a **viewing sanctuary**. Crafted with a meticulous "Dark Glass" aesthetic inspired by next-generation operating systems, every pixel is polished to ensure your content is the hero. Whether you're streaming high-bitrate movies or quick clips, Vayu delivers smoother playback, smarter buffering, and a distraction-free environment.

---

## ✨ Features

### 💎 **Premium Design**

- **Glassmorphism UI** — Controls float on elegant dark blur
- **Micro-Animations** — Smooth transitions and hover effects
- **Focus Mode** — Interface fades away for distraction-free viewing
- **Fully Responsive** — Optimized for mobile, tablet, and desktop

### 🎥 **Pro-Grade Streaming**

- **Universal Format Support** — HLS (`.m3u8`) and DASH (`.mpd`) streams
- **Smart Buffering** — Real-time bandwidth monitoring
- **CORS Bypass Proxy** — Stream from any source

### 🎛️ **Ultimate Control**

- **🎵 Audio Track Switching** — Select between multiple audio languages
- **📝 Custom Captions** — Position anywhere on screen, adjust size/color/opacity
- **📂 External Subtitles** — Load local `.srt` or `.vtt` files
- **🖼️ Picture-in-Picture** — Keep watching while multitasking

### 🔖 **Bookmark & History**

- **📌 Pin Videos** — Save favorites with custom names
- **🕐 Watch History** — Quick access to recent videos
- **🗑️ Individual Delete** — Remove specific items from history
- **💾 Persistent Storage** — All preferences saved locally

---

## 🧭 User Guide

### 🎬 **Playing a Video**

1. Paste any video URL (`.mp4`, `.m3u8`, `.mpd`) into the input field
2. Toggle **"Use Proxy"** if the video has CORS restrictions
3. Click **Play** or press `Enter`

### 🔖 **Pinning Videos**

1. Play some videos to build your history
2. Hover over any video in **"Recently Played"**
3. Click the **bookmark icon** (🔖) to pin
4. Enter a custom name like "Favorite Movie"
5. Find it in the **Pinned** section at the top!

### 🎵 **Switching Audio Tracks**

1. Load an HLS stream with multiple audio tracks
2. Hover over the **Audio button** (🎵) in controls
3. Select your preferred language from the dropdown

### 📝 **Customizing Captions**

1. Hover over the **CC button** in controls
2. Adjust:
   - **Font Size** — Make text larger/smaller
   - **Position** — Move text anywhere on screen
   - **Color** — Choose from preset colors
   - **Background** — Adjust opacity
3. Load external `.srt`/`.vtt` files if needed

---

## ⌨️ Keyboard Shortcuts

| Key                         | Action             |
| :-------------------------- | :----------------- |
| <kbd>Space</kbd>            | Play / Pause       |
| <kbd>F</kbd>                | Toggle Fullscreen  |
| <kbd>M</kbd>                | Mute Toggle        |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek ±10 seconds   |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume Up / Down   |
| <kbd>0</kbd> - <kbd>9</kbd> | Jump to 0% - 90%   |
| <kbd>P</kbd>                | Picture-in-Picture |

---

## 🚀 Deployment

### **Vercel (Recommended)**

This project is Vercel-ready out of the box!

```bash
# 1. Push to GitHub
git add .
git commit -m "Deploy Vayu Player"
git push origin main

# 2. Import in Vercel
# - Go to vercel.com
# - Import your GitHub repo
# - Deploy!
```

### **Local Development**

```bash
# Start the proxy server
node server.js

# Open in browser
http://localhost:4000
```

---

## 📁 Project Structure

```
vayu-player/
├── index.html          # Main HTML
├── style.css           # All styles
├── player.js           # Player logic
├── server.js           # Local proxy server
├── api/
│   └── proxy.js        # Vercel serverless function
├── vercel.json         # Vercel config
├── package.json        # Dependencies
└── README.md           # This file
```

---

## 🛠️ Tech Stack

| Technology             | Purpose          |
| :--------------------- | :--------------- |
| HTML5, CSS3, JS (ES6+) | Core application |
| hls.js                 | HLS streaming    |
| dash.js                | DASH streaming   |
| Node.js                | Proxy server     |
| Vercel                 | Deployment       |

---

## 📱 Responsive Design

Vayu Player is optimized for all screen sizes:

- **📱 Mobile** — Touch-friendly controls, always-visible action buttons
- **📱 Tablet** — Optimized grid layouts
- **💻 Desktop** — Full feature set with hover interactions

---

## 🎨 Customization

Edit CSS variables in `style.css`:

```css
:root {
  --accent-primary: #0a84ff; /* Brand color */
  --bg-deep: #000000; /* Background */
  --radius-lg: 16px; /* Corner radius */
}
```

---

<div align="center">

_Engineered for Perfection._

**Chirantan Mallick** © 2026

[Codiverse Web Services](https://codiverse-dev.vercel.app/)

</div>
