# Public Asset Layout

- `content/`, `includes/`, plus route folders like `about/`, `players/`, `media/`, `search/`:
  Active static export assets/pages used at runtime.

- `_source/index.html`:
  Source HTML loaded by the React mirror loader.

- `_archive-original/`:
  Older mirror copy kept only for backup/reference.
  Not used by the app.

- `data/athletes.json`:
  Editable athlete data source used by the home and search experience.
  Update this file to add/remove athletes or change featured/new flags.
