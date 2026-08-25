# OFFICIAL

# Civil Service Pension Assistant branding for Phase 13

This is an overlay for the working Phase 13 deployment. It is not a standalone site.

## Upload

Upload these files to the existing Phase 13 repository:

- `cspa-branding.css`
- `cspa-branding.js`
- `assets/icon.svg` (replace the existing icon)

## Add two lines to `index.html`

Immediately after the existing `styles.css` link, add:

```html
<link rel="stylesheet" href="cspa-branding.css">
```

Immediately after the existing `app.js` script and before `</body>`, add:

```html
<script src="cspa-branding.js"></script>
```

No existing JavaScript or calculator engines are replaced.
