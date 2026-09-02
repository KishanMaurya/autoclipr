# Assistant header faces

Drop three square images here:

```
1.jpg   2.jpg   3.jpg
```

They render as overlapping circles in the assistant header. Square crops work
best — anything else is centre-cropped by `object-fit: cover`. 128×128 or
larger.

Any file that is missing falls back to a lettered circle, so the header is
never broken by an absent image. That also means you can add them one at a
time.

## Two things to keep straight

**Licensing.** Only use images you have the right to use. Stock sites watermark
their previews (an "Unsplash+" or similar overlay means you are looking at an
unlicensed preview, not a usable file). Buy the licence or use photos you own.

**What the faces imply.** These are placeholders until live human chat is
switched on. The header's status line deliberately still reads
"AI assistant · Kishan reads escalations" so the cluster reads as decoration
rather than a roster of agents standing by — a user who sees faces, asks for a
person, and finds nobody there is worse off than one who was told up front.
When real human chat ships, swap these for the real team and update that line.

To change how many faces show or their fallback letters, edit `SUPPORT_FACES`
in `apps/web/src/components/assistant/assistant-widget.tsx`.
