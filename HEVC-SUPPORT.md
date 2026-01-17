# HEVC (H.265) Video Support in Vayu Player

## Overview

Vayu Player now has enhanced support for HEVC (H.265) encoded videos with comprehensive audio codec handling.

## What's Been Added

### 1. **HEVC Detection**

- Automatically detects HEVC videos from URL patterns (`hevc`, `h265`, `x265`)
- Logs HEVC-specific information for debugging

### 2. **Audio Codec Support**

The player now explicitly handles audio in HEVC files:

#### ✅ **Fully Supported Audio Codecs:**

- **AAC** (Advanced Audio Coding) - Most common in HEVC files
- **MP3** (MPEG Audio Layer III)
- **Opus** - Modern, efficient codec
- **Vorbis** - Open-source codec

#### ⚠️ **Limited Support (Browser/OS Dependent):**

- **AC3** (Dolby Digital) - Requires Windows 10/11 with proper codecs
- **EAC3** (Dolby Digital Plus) - Requires Windows 10/11 with proper codecs
- **DTS** - Very limited browser support

### 3. **Audio Track Handling**

- **Automatic unmuting**: Ensures video is never muted on load
- **Volume normalization**: Sets volume to 100% by default
- **Track detection**: Identifies and enables embedded audio tracks
- **Multi-track support**: Handles videos with multiple audio streams

### 4. **Debugging Features**

Enhanced console logging shows:

- Video properties (duration, resolution, ready state)
- Audio track information (count, labels, enabled status)
- Codec compatibility warnings
- Mute/volume status verification

## Browser Compatibility

### HEVC Video Codec Support:

| Browser                  | HEVC Support | Notes                            |
| ------------------------ | ------------ | -------------------------------- |
| **Safari (macOS/iOS)**   | ✅ Full      | Native hardware decoding         |
| **Edge (Windows 10/11)** | ✅ Full\*    | \*Requires HEVC Video Extensions |
| **Chrome**               | ❌ No        | Not supported                    |
| **Firefox**              | ❌ No        | Not supported                    |

### Audio Codec Support in HEVC:

Most browsers support AAC, MP3, Opus, and Vorbis. AC3/EAC3 support varies by OS.

## How It Works

### When Loading a HEVC Video:

1. **Detection Phase**

   ```
   🎥 HEVC video detected - ensuring audio codec compatibility
   ```

2. **Metadata Loading**

   ```
   🎬 Video metadata loaded, checking for embedded tracks...
   📊 Video Properties: { duration, width, height, readyState }
   ```

3. **Audio Track Detection**

   ```
   🔊 Found X audio track(s)
     Track 0: English - Enabled
   ✅ Enabled audio track 0
   ```

4. **Audio Verification**
   ```
   🔍 Verifying audio setup...
      Muted: false
      Volume: 1
      Audio Tracks: 1
   ```

## Troubleshooting

### No Audio in HEVC Videos?

1. **Check Browser Console** (F12)
   - Look for audio codec warnings
   - Verify audio tracks are detected

2. **Verify Browser Support**
   - Use Safari or Edge for best HEVC support
   - Install "HEVC Video Extensions" on Windows 10/11

3. **Check Audio Codec**
   - If the file uses AC3/EAC3, it may not play in all browsers
   - Re-encode with AAC audio for universal compatibility

4. **Volume/Mute Issues**
   - The player now auto-unmutes and sets volume to 100%
   - Check system volume and browser tab mute status

### Common Issues:

#### "Video plays but no audio"

- **Cause**: Unsupported audio codec (likely AC3/EAC3/DTS)
- **Solution**:
  - Use Safari or Edge with proper codecs installed
  - Or re-encode video with AAC audio

#### "Video doesn't load at all"

- **Cause**: Browser doesn't support HEVC video codec
- **Solution**: Use Safari or Edge, or re-encode to H.264

## Testing Your HEVC Videos

1. Open browser console (F12)
2. Load your HEVC video
3. Check the console logs for:
   - ✅ "HEVC video detected"
   - ✅ "Found X audio track(s)"
   - ✅ "Verifying audio setup"
   - ⚠️ Any codec warnings

## Recommendations

### For Best Compatibility:

1. **Video Codec**: H.264 (more compatible) or HEVC (better compression)
2. **Audio Codec**: AAC (best compatibility)
3. **Container**: MP4 or MKV
4. **Browser**: Safari (macOS/iOS) or Edge (Windows)

### For HEVC Files:

- Ensure audio is encoded in AAC
- Test in Safari or Edge first
- Check console logs for codec information
- Consider providing H.264 fallback for Chrome/Firefox users

## Technical Details

### Code Changes Made:

1. **loadDirectVideo() function**:
   - Added HEVC detection
   - Forced unmute and volume setting
   - Enhanced audio track detection and enabling
   - Added comprehensive logging

2. **Audio Track Verification**:
   - Checks on `loadedmetadata` event
   - Re-checks on `canplay` event
   - Auto-enables first audio track if none enabled

3. **Homepage Updates**:
   - Added MKV to supported formats list

## Future Enhancements

Potential improvements:

- [ ] Software decoder for unsupported browsers (FFmpeg.js)
- [ ] Audio codec detection and user warnings
- [ ] Automatic H.264 fallback suggestions
- [ ] Audio track switching UI improvements

---

**Last Updated**: January 18, 2026
**Version**: 1.1.0
