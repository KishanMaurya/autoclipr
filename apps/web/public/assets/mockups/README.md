# Platform mockup clips

Short muted loops shown inside the phone mockups in the "Publish directly to
every platform" section (`components/landing/publish-directly.tsx`).

Expected files — the paths are referenced in `MOCKUP_CLIPS`:

| File            | Mockup          |
| --------------- | --------------- |
| `youtube.mp4`   | YouTube Shorts  |
| `instagram.mp4` | Instagram Reels |
| `tiktok.mp4`    | TikTok          |
| `facebook.mp4`  | Facebook Reels  |

LinkedIn deliberately has no clip: that mockup is a feed post, not a phone
screen, so it keeps a static thumbnail.

## Requirements

- **9:16 vertical.** The mockup screens are `aspect-[9/16]` and the video uses
  `object-fit: cover`, so anything wider gets cropped left and right.
- **Short** — 4–8 seconds. They loop, so pick a segment that loops without a
  jarring cut.
- **No audio.** The element is muted (required for autoplay), so an audio track
  is just wasted bytes. Strip it.
- **Small.** Aim for under ~1 MB each. These load on the marketing page.
- **Nothing that dates or misleads** — real clip output is ideal, since the
  section is claiming this is what AutoClipr publishes.

Missing or unplayable files are handled: the mockup falls back to its gradient
placeholder rather than showing a broken element.

## Producing a file

From any source video, cropping to 9:16 and stripping audio:

```bash
ffmpeg -i input.mp4 -t 6 \
  -vf "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale=720:1280" \
  -an -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p \
  -movflags +faststart youtube.mp4
```

If the source is already 9:16, drop the `crop` and keep only `scale=720:1280`.
Raise `-crf` to shrink the file further (higher number = smaller and softer).
