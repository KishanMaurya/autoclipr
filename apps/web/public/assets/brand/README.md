# Brand assets

| File | Used by | Notes |
| --- | --- | --- |
| `logo.png` | site icon, email templates | 512×512 |
| `founder.jpg` | assistant widget header | **Optional.** Square, ideally 128×128 or larger. |

## founder.jpg

The support assistant shows this photo in its header. It is deliberately one
real person rather than a cluster of stock "support team" faces: the assistant
is a bot with no human queue behind it, and implying agents who do not exist
backfires the moment a user asks for one. A named founder is both warmer and
true.

If the file is absent the header falls back to initials automatically — the
widget is never broken by its absence, so this can be added whenever.

To change the name or initials, edit `FOUNDER_NAME` / `FOUNDER_INITIALS` in
`apps/web/src/components/assistant/assistant-widget.tsx`.
