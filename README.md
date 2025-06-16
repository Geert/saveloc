# SaveLoc

Save current location

SaveLoc is a simple web app for bookmarking locations on a map. You can add your current GPS position or enter coordinates manually. Each saved entry gets a label and appears in the map view, where you can edit or remove it.

## Getting started

Open `index.html` directly in your browser, or start a small local server from this folder:

```bash
python3 -m http.server
```

Then browse to <http://localhost:8000>.

## Import/export

Use the menu to export all locations to an XML file or import from an existing file. Saved locations are stored in your browser's `localStorage` so they remain available on your device.
