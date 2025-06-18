# SaveLoc

Save current location

SaveLoc is a simple web app for bookmarking locations on a map. You can add your current GPS position or enter coordinates manually. Each saved entry gets a label and appears in the map view, where you can edit or remove it.

## Getting started

Open `docs/index.html` directly in your browser, or start a small local server from this folder and navigate to `/docs`:

```bash
python3 -m http.server
```

Then browse to <http://localhost:8000/docs>.

### Setup

Install dependencies and run the test suite with:

```bash
npm install
npm test
```

To launch the app locally:

```bash
python3 -m http.server
```

## Location Permission

SaveLoc needs access to your browser's Geolocation API when adding a location.
On first use you will be asked to grant permission. If you accidentally deny the
request, enable location access for the page in your browser settings.

## Import/export

Use the menu to export all locations to an XML file or import from an existing file. Saved locations are stored in your browser's `localStorage` so they remain available on your device.

## Offline support

The app registers a service worker that caches the main page, scripts, styles and map tiles. Once loaded, you can revisit the page without a network connection and previously viewed map areas will remain available.

## Accessibility

The application supports keyboard navigation. When forms or the drawer open, focus moves to the first input so screen reader users know where to start. You can reposition markers without using a mouse by editing the latitude and longitude fields in the edit drawer; changes update the marker on the map immediately.

## Running tests

After installing dependencies run:

```bash
npm test
```

The tests reside in the `tests` directory and cover the main functionality.

All production assets are located in the `docs` folder so the project works out of the box with GitHub Pages.
