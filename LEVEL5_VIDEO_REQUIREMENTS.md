# Level 5 Video Requirements

## Overview
Level 5 is a "Maintain Speed Limit" level where users must keep their vehicle speed under 70 km/h throughout a 15-second video.

## Video Specifications

**File:** `src/videos/level5.mp4`
**Duration:** 15 seconds
**Format:** MP4 video

## Video Timeline

- **0:00 - 4:00s:** Initial driving scene (at normal speed)
- **4:00s:** Speed limit indicator shows: 🚓 "Speed Limit: 70 km/h" (with announcement)
- **4:00 - 15:00s:** Monitoring period - detect if user exceeds 70 km/h
  - If speed > 70 km/h: Show warning "⚠️ SPEED LIMIT EXCEEDED!" with red border around screen + beep sound
  - Red border appears around entire screen with red glow effect
  - Beep occurs every 500ms while speed is exceeded
  - Do NOT pause the video (user can continue)
- **15:00s:** Video ends → Show "Level Completed" popup (if user maintained speed limit)

## User Actions

**Success:** Video plays to end without exceeding 70 km/h
**Warning:** Speed exceeds 70 km/h during monitoring period
- No pause/failure - user can continue
- Visual feedback: Red "SPEED LIMIT EXCEEDED!" banner
- Audio feedback: Beep sound every 500ms
- Red border glow around entire screen

## Technical Implementation

The Level 5 implementation includes:
1. Speed limit indicator at 4-second mark
2. Real-time speed monitoring (calculates km/h from video playback rate)
3. Visual alerts: Red banner + red border glow when limit exceeded
4. Audio alerts: Beep sound when limit exceeded
5. Success on video completion

## Video Creation Tips

Use a dashcam/highway driving footage that shows:
- Clear road and driving perspective
- Moderate speed initially
- Opportunity for user to accelerate (simulate overspeeding)
- Natural driving scenario

**Software options:**
- FFmpeg (command line)
- Adobe Premiere Pro
- DaVinci Resolve (free)
- iMovie/Windows Photos
- OBS Studio

**Example FFmpeg command:**
```bash
ffmpeg -i input.mp4 -t 15 -c:v libx264 -crf 23 -c:a aac level5.mp4
```

Place the created `level5.mp4` file in: `src/videos/level5.mp4`
