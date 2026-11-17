# Edit Profile

The profile editor is the authenticated dashboard for existing TC Cards users. It supports OTP sign-in, profile and style changes, image uploads, QR codes, email preferences, and analytics.

## How it fits into the profile flow

The initial profile signup is handled by the separate **Total Connect** project at `Total Connect/plans/basic/code.gs`. It writes a new profile row to the Google Sheets `Form` sheet, initially with `Status` set to `Inactive`. This editor authenticates users and updates their existing rows. The public card site in **TC-Basic** reads profile rows to display the cards. The signup script is referenced for context and remains in the Total Connect project; it is not copied into this repository.

```text
Total Connect signup → Form sheet ← Edit-Profile updates
                             ↓
                    TC-Basic public cards
```

## Deployment

1. Serve the repository root over HTTPS. GitHub Pages deployment is defined in `.github/workflows/run.yml`.
2. Put `auth.gs` and `edit.gs` in the same spreadsheet-bound Google Apps Script project. The editor backend handles OTP/session operations, profile updates, email preferences, and analytics.
3. Deploy the Apps Script project as a web app. Set `googleScriptUrl` and `googleEditUrl` in `Assets/js/config.js` to the intended web app deployments, then publish after backend changes.
4. The spreadsheet must have a `Form` sheet with profile field headers. The editor finds columns by header; `Style` or `Selected Style` stores the selected card background/style.
5. Configure the Cloudinary unsigned upload preset used by `Assets/js/profile.js` for the required image formats and 2 MB limit. Set `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`, and optionally `CLOUDINARY_CLOUD` in Apps Script properties if replaced profile images should be deleted.

## Style values

Gradients are stored directly in `Style`, for example `linear-gradient(135deg, #7c3aed, #1d4ed8, #0f172a)`. Image backgrounds use `url('https://example.com/Image.png')/dark` or `/light`. URL path and query casing is preserved.

Before removing the old background image column, migrate each existing image URL into its row's `Style` value. Replace the old `image/dark` or `image/light` marker with the URL form, preserving the row's theme. Removing the old column first would remove the only copy of those image URLs.

## Local checks

The front end uses native JavaScript modules and has no build step. Apps Script files must be deployed from the Apps Script editor; local syntax checks do not validate Google service permissions, sheet structure, or deployment configuration.
