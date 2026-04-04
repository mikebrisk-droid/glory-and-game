# Glory & Game Local Copy

This workspace now has two versions:

- `site-editable/` (recommended): simplified `index.html` + `assets/` structure for easier edits
- `site-mirror-wget/`: raw wget mirror snapshot

## Run the editable version

```bash
python3 -m http.server 4174 --directory site-editable
```

Then open:

- `http://localhost:4174`

## Edit here

- Main page: `site-editable/index.html`
- Custom overrides: `site-editable/assets/custom.css`
- Mirrored theme/plugin files: `site-editable/assets/wp-content/...`

## Refresh raw mirror from production

```bash
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent --domains=gloryandgame.com,www.gloryandgame.com -P site-mirror-wget https://gloryandgame.com/
```

## Notes

- This is a static snapshot, not a full WordPress backend.
- Forms, dynamic WP endpoints, and admin/editor features will not work offline.
