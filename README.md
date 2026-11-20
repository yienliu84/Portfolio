# Yi’en Liu — Engineering Portfolio

GitHub Pages publishes this portfolio from `main`.

## Edit project text and photos

Open [the portfolio editor](https://yienliu84.github.io/Portfolio/edit.html), or use **Edit portfolio** in the portfolio footer.

1. Choose a project and edit its title, summary, full description, or highlights.
2. Use **Next** to reach the **+ Add photos** slide at the end of the gallery, or select the **+** thumbnail. Choose one or more JPG, PNG, WebP, or GIF files (up to 20 MB per photo). Cycle through the photos to edit their titles, captions, and screen-reader descriptions.
   **Delete photo** removes the selected picture from the draft. **Undo deletion** restores deleted pictures, including their titles and captions, until the draft is published. Deletions and undo history survive a browser reload. A project can also have no photos while its text remains visible.
   Drag thumbnails to reorder the photos, or select a photo and use **Move earlier** or **Move later**. The draft preview uses the new order.
3. Check the live draft preview. Drafts save in the current browser and are shown only in draft previews.
4. To publish directly, create a fine-grained GitHub token for only this repository with **Contents: read and write**, paste it into the editor, and choose **Publish to GitHub**. Tokens are not saved in drafts and are cleared after each publish attempt.

For edits that do not add new photos, you can also choose **Copy updated content.js**, open GitHub’s editor, replace the file, and commit it. **Download content.js** provides a local copy of the text and photo entries. Use **Publish to GitHub** to save new photo files alongside the updated content. GitHub Pages updates after the commit is deployed.

If GitHub has changed since a draft was started, the editor stops the save to protect the newer changes. Download the draft before loading the current published version.

## Files

- `content.js`: project text, photo titles, and captions. The editor updates this file and saves newly added images to `assets/photos/`.
- `edit.html`, `editor.js`, `editor.css`: visual editor and publishing controls.
- `index.html`, `site.js`, `gallery.css`: public portfolio and photo galleries.
- `content-tools.js`: content parsing, draft format, and UTF-8 encoding.
- `assets/photos/`: original project images and the supplied Manta and MERV images. SVG containers embed the original image bytes without cropping or recompressing them.

Manta contains the three replacement views. MERV retains its three original pictures and includes six new gearbox, drive shaft, and tread pictures. R.O.V.E.R., IVO glasses, and the motion capture mount use their original pictures. Previous model assets are retained in Git history and are not loaded by the website.

## Project videos

Use **Add photos or videos** in the portfolio editor, choose a project, and select MP4 or WebM videos (up to 25 MB per video). Export MP4 with H.264 video and AAC audio for broad browser support. Photos and videos share the gallery; captions, drag ordering, delete, undo, and draft previews work for both. Videos have play, volume, seeking, and fullscreen controls and do not autoplay. Changing slides or closing the project pauses playback.

New files remain in this browser's draft until **Publish to GitHub** uploads them with the project content in one commit. Videos are saved in `assets/videos/`. Downloading `content.js` saves descriptions only; publish through the editor to include uploaded files.

## Optional project specifications

Each project has a **Specifications (optional) — one bullet per line** field below Highlights in the editor. Enter hardware, software features, dimensions, materials, or performance specs on separate lines. The project details show these as a separate Specifications bullet list styled like Highlights. Leave the field blank to hide the entire section. Specifications use the same draft preview, browser recovery, download, and publishing controls as other project text.
