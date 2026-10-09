# Yi’en Liu — Engineering Portfolio

GitHub Pages publishes this portfolio from `main`.

## Edit project text and photo captions

Open [the portfolio editor](https://yienliu84.github.io/Portfolio/edit.html), or use **Edit portfolio** in the portfolio footer.

1. Choose a project and edit its title, summary, full description, or highlights.
2. Cycle through its photos. Each photo has its own title, information box, and screen-reader description.
   **Delete photo** removes the selected picture from the draft. **Undo deletion** restores deleted pictures, including their titles and captions, until the draft is published. Deletions and undo history survive a browser reload. A project can also have no photos while its text remains visible.
3. Check the live draft preview. Drafts save in the current browser and are shown only in draft previews.
4. To publish directly, create a fine-grained GitHub token for only this repository with **Contents: read and write**, paste it into the editor, and choose **Publish to GitHub**. Tokens are not saved in drafts and are cleared after each publish attempt.

You can also choose **Copy updated content.js**, open GitHub’s editor, replace the file, and commit it. **Download content.js** provides a local copy of your draft. GitHub Pages updates after the commit is deployed.

If GitHub has changed since a draft was started, the editor stops the save to protect the newer changes. Download the draft before loading the current published version.

## Files

- `content.js`: project text, photo titles, and captions. The editor updates only this file.
- `edit.html`, `editor.js`, `editor.css`: visual editor and publishing controls.
- `index.html`, `site.js`, `gallery.css`: public portfolio and photo galleries.
- `content-tools.js`: content parsing, draft format, and UTF-8 encoding.
- `assets/photos/`: original project images and the supplied Manta and MERV images. SVG containers embed the original image bytes without cropping or recompressing them.

Manta contains the three replacement views. MERV retains its three original pictures and includes six new gearbox, drive shaft, and tread pictures. R.O.V.E.R., IVO glasses, and the motion capture mount use their original pictures. Previous model assets are retained in Git history and are not loaded by the website.
