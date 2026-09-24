# Field-note photographs

Drop image files in this folder. They appear in the "Field notes" strip
on the home page automatically, sorted by filename.

- Formats: jpg, jpeg, png, webp, avif, gif, svg
- Order: alphabetical, so prefix with `01-`, `02-` to control the fan
- Shape: the cards crop to 3:4 portrait, so portrait originals fare best
- Count: four reads best; more than six and the fan stops fanning

**Alt text.** Add an entry to `captions{}` in `src/lib/notes.ts`, keyed by
the filename without its extension. Without one the build still succeeds
and logs a warning, falling back to a title-cased filename, which is a
placeholder and not real alt text.

While this folder holds no images, the strip falls back to the generated
placeholders in `public/mock/`.
