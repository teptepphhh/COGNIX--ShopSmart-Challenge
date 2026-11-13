# Evidence Index

## Screenshot files required

Save the actual browser screenshots into `../evidence/screenshots/`:

| Filename | Capture | Required visible evidence | Status |
|---|---|---|---|
| `01-assistant-catalog-match.png` | Ask “Which keyboard is below ₱2,000?” | Question, Compact Mechanical Keyboard, ₱1,850, product link, expanded Sources | Not present in package yet |
| `02-assistant-no-match.png` | Ask “Do you sell refrigerators?” | Question and honest no-match message; no recommendations or sources | Not present in package yet |
| `03-assistant-provider-fallback.png` | Ask the keyboard question with provider unavailable or no key configured | Fallback notice, verified answer, recommendation link | Not present in package yet |

The screenshots were shown in chat/browser tool output, but those image outputs were not available as filesystem files during package creation. Do not replace these with fabricated or reconstructed images. Save the original screenshots from the conversation if available, or recapture them in the running app.

## Other evidence recorded

- Automated check: `npm run check` passed on 2026-11-13.
- Assistant API checks: valid catalog match, no-match, and invalid input were observed.
- Browser flow: product add-to-cart through simulated order confirmation was observed.
- Test details: see `02-Test-Record.md`.

## Privacy check

Do not include `.env` files, API keys, customer data, or order form values in screenshots. The package contains only the `.env.example` templates.
