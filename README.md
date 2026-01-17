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

- **Universal Format Support** — HLS (`.m3u8`), DASH (`.mpd`), MP4, MKV, WebM
- **Smart Buffering** — Real-time bandwidth monitoring
- **CORS Bypass Proxy** — Stream from any source
- **Adaptive Quality** — Automatic quality switching for HLS/DASH streams

### 🎛️ **Ultimate Control**

- **🎵 Multi-Audio Track Support** — Automatically detects and switches between embedded audio languages
- **📝 Embedded Subtitle Detection** — Auto-detects subtitles in MKV/MP4 files (like VLC!)
- **🎨 Custom Caption Styling** — Position anywhere, adjust size/color/opacity
- **📂 External Subtitle Upload** — Load local `.srt` or `.vtt` files
- **🖼️ Picture-in-Picture** — Keep watching while multitasking
- **⚡ Speed Control** — 0.25x to 2x playback speed
- **🎚️ Volume Slider** — Precise audio control

### 📚 **Community Library**

- **🌐 Shared Video Collection** — Browse videos added by the community
- **🔍 Search & Filter** — Find videos by name, type, or language
- **➕ Add Your Own** — Contribute videos to the shared library
- **👤 User Attribution** — See who added each video

### 🔐 **Admin Panel**

- **🔒 Secure Access** — Password-protected admin interface at `/doasadmin`
- **✏️ Edit Videos** — Update video names, links, types, and languages
- **🗑️ Delete Videos** — Remove inappropriate or broken content
- **🔍 Search Management** — Find and manage videos easily

### 🔖 **Personal Features**

- **📌 Pin Videos** — Save favorites with custom names
- **🕐 Watch History** — Quick access to recently played videos
- **🗑️ Individual Delete** — Remove specific items from history
- **💾 Persistent Storage** — All preferences saved locally
- **⏯️ Resume Playback** — Continue where you left off

---

## 🧭 User Guide

### 🎬 **Playing a Video**

#### **Method 1: Direct URL**

1. Paste any video URL (`.mp4`, `.mkv`, `.m3u8`, `.mpd`) into the input field
2. Toggle **"Use Proxy"** if the video has CORS restrictions
3. Click **Play** or press `Enter`

#### **Method 2: From Library**

1. Click the **Library** button in the header
2. Browse or search for videos
3. Click any video card to play instantly

#### **Method 3: From History**

1. Previously watched videos appear in **"Recently Played"**
2. Click any video to replay

### 📚 **Adding to Library**

1. Click **Library** → **"Add yours"** button
2. Fill in the form:
   - **Video Name** (e.g., "Inception")
   - **Video Link** (direct URL)
   - **Type** (Movie/Series/Other)
   - **Language**
   - **Your Name** (optional)
3. Click **Add to Library**
4. Video is now available to everyone!

### 🔖 **Pinning Videos**

1. Play some videos to build your history
2. Hover over any video in **"Recently Played"**
3. Click the **bookmark icon** (🔖) to pin
4. Enter a custom name like "Favorite Movie"
5. Find it in the **Pinned** section at the top!

### 🎵 **Using Multi-Audio Tracks**

**For videos with embedded audio tracks (MKV/MP4):**

1. Load a video with multiple audio streams
2. Player automatically detects all tracks
3. Hover over the **Audio button** (🎵) in controls
4. Select your preferred language from the dropdown

**Supported formats:**

- MKV files with multiple audio streams
- MP4 files with embedded audio tracks
- HLS streams with audio variants

### 📝 **Using Subtitles**

**Embedded Subtitles (Automatic):**

- Player automatically detects subtitles in MKV/MP4 files
- Just like VLC, no manual setup needed!

**External Subtitles (Manual):**

1. Hover over the **CC button** in controls
2. Click **"Upload Subtitle File"**
3. Select your `.srt` or `.vtt` file
4. Subtitles appear automatically

**Customization:**

- **Font Size** — Make text larger/smaller
- **Position** — Move text anywhere on screen
- **Color** — Choose from preset colors
- **Background** — Adjust opacity

### 🔐 **Admin Panel Access**

1. Navigate to `your-site.com/doasadmin`
2. Enter admin credentials
3. Manage all library videos:
   - Edit video details
   - Delete inappropriate content
   - Search and filter

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

### **Prerequisites**

1. **Supabase Account** (for shared library)
   - Create a free account at [supabase.com](https://supabase.com)
   - Create a new project
   - Run the SQL setup script (see below)

2. **Vercel Account** (for hosting)
   - Free account at [vercel.com](https://vercel.com)

### **Supabase Setup**

1. Go to your Supabase project → **SQL Editor**
2. Run this SQL:

```sql
-- Create videos table
create table public.videos (
  id bigint generated by default as identity primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  link text not null,
  type text,
  lang text,
  "user" text
);

-- Enable Row Level Security
alter table public.videos enable row level security;

-- Allow public access (read/write)
create policy "Enable full access for all users"
on public.videos
for all
using (true)
with check (true);
```

3. Go to **Settings** → **API**
4. Copy your **Project URL** and **anon public** key
5. Update `sections/common/supabase.js`:

```javascript
const SUPABASE_URL = "your-project-url";
const SUPABASE_ANON_KEY = "your-anon-key";
```

### **Vercel Deployment**

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
├── index.html              # Main HTML
├── style.css               # All styles
├── server.js               # Local proxy server
├── api/
│   └── proxy.js            # Vercel serverless function
├── sections/
│   ├── common/
│   │   ├── utils.js        # Shared utilities
│   │   └── supabase.js     # Database connection
│   ├── home/
│   │   └── home.js         # History & pinned videos
│   ├── library/
│   │   ├── library.js      # Library management
│   │   └── add-modal.js    # Add video modal
│   └── player/
│       └── player.js       # Core player logic
├── doasadmin/
│   ├── index.html          # Admin panel UI
│   ├── style.css           # Admin styles
│   └── admin.js            # Admin logic
├── js/
│   └── main.js             # App entry point
├── vercel.json             # Vercel config
├── package.json            # Dependencies
└── README.md               # This file
```

---

## 🛠️ Tech Stack

| Technology             | Purpose                   |
| :--------------------- | :------------------------ |
| HTML5, CSS3, JS (ES6+) | Core application          |
| hls.js                 | HLS streaming             |
| dash.js                | DASH streaming            |
| Supabase               | Database (shared library) |
| Node.js                | Proxy server              |
| Vercel                 | Deployment & hosting      |

---

## 🎯 How It Works

### **Video Playback**

- Vayu Player is a **streaming player**, not a hosting service
- Videos are loaded from external URLs (Google Drive, Dropbox, etc.)
- Only video **metadata** (name, link, type) is stored in the database
- Actual video files remain on their original hosting

### **Track Detection**

- **Embedded tracks** (audio/subtitles in MKV/MP4) are detected automatically
- **HLS/DASH manifests** are parsed for available tracks
- Works exactly like VLC - if VLC can detect it, so can Vayu!

### **Community Library**

- Users add video links to a shared Supabase database
- Everyone can browse and play videos added by others
- Admin can moderate content via the admin panel

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

## 🔒 Security Notes

- **Admin Panel**: Client-side authentication (suitable for personal use)
- **Database**: Public read/write access (users can add/view videos)
- **For Production**: Consider adding server-side authentication and content moderation

---

## 📝 License

This project is open source and available for personal and commercial use.

---

<div align="center">

_Engineered for Perfection._

**Chirantan Mallick** © 2026

[Codiverse Web Services](https://codiverse-dev.vercel.app/)

</div>
