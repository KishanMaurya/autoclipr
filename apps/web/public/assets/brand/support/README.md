# Assistant header faces

Three images render as overlapping circles in the assistant header. The
filenames are listed in `SUPPORT_FACES` (see below) — change them there if you
use different ones.

Square crops work best. Anything else is cropped by `object-fit: cover`, and
because the crop is anchored to the top (`object-top`) a portrait photo keeps
the face rather than centring on the torso. Check the result at the real 32px
size: what reads fine full-size can be unrecognisable in a circle that small.

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
