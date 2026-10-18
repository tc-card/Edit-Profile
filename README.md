# Edit Profile

Profile editor for tccards, with OTP sign-in, profile updates, image uploads, QR generation, and analytics.

## Deployment

1. Serve the repository root over HTTPS (GitHub Pages is configured in `.github/workflows/pages.yml`).
2. Put `auth.gs` and `edit.gs` in the same spreadsheet-bound Google Apps Script project. They share one `doGet`/`doPost` router and the script cache used for OTP and sessions.
3. Deploy the Apps Script project as a web app. Set both `googleScriptUrl` and `googleEditUrl` in `Assets/js/config.js` to web app deployments of that same project, and publish each deployment after backend changes.
4. The spreadsheet must have a `Form` sheet with headers for the profile fields. The editor discovers columns by header, so column order may change. The `Style` (or `Selected Style`) field stores gradients or image styles.
5. Configure the Cloudinary unsigned upload preset used by `Assets/js/profile.js` to allow only the required image formats and the 2 MB limit. Set `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`, and optionally `CLOUDINARY_CLOUD` in Apps Script properties if replaced profile images should be deleted.

## Style values

Gradients are saved directly in `Style`, for example `linear-gradient(135deg, #7c3aed, #1d4ed8, #0f172a)`. Image backgrounds are saved as `url('https://example.com/Image.png')/dark` or `/light`. URL path and query casing is preserved.

Before removing the old background image column, migrate each existing image URL into its row's Style value. Replace the old `image/dark` or `image/light` marker with the URL form above, preserving the row's theme. Deleting the old column first removes the only copy of those image URLs.

## Local checks

The front end is native JavaScript modules and has no build step. Check syntax with `node --check` on files under `Assets/js`. Apps Script files must be deployed from the Apps Script editor; local syntax checks do not validate Google service permissions, sheet structure, or deployment configuration.
