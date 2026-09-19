# Asset sources

- `assets/land.json`: Natural Earth 1:110m land polygons, public domain, used to restrict ground transport between disconnected land areas. Simplified coastlines are approximate. [Source](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson).

- Offline city autocomplete: [Natural Earth 1:50m populated places](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_populated_places_simple.geojson), a public-domain dataset. `src/cityCatalog.ts` retains names, alternate names, coordinates, country identifiers and display rank for 1,251 places, combined with the existing curated destinations. Search runs on device without sending typed queries to a geocoding service. Geographic prominence ranks determine ordering after exact and prefix matches; this is not a live tourism popularity ranking.
- Additional popular destinations (including Pokhara, Phuket and Udaipur): selected records from [Natural Earth 1:10m populated places](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_populated_places_simple.geojson), also public domain.

- Live web map: MapLibre GL JS and the [OpenFreeMap Dark style](https://openfreemap.org/quick_start/), with customized colors. OpenMapTiles / OpenStreetMap attribution remains on the map. The provider receives viewport/tile requests; trip notes and account identifiers are not sent. Pins and routes are client-rendered overlays.
- `assets/countries.json`: [Natural Earth 1:110m admin-0 countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson), public-domain geographic data, used for hover hit testing, continents, and native overview geometry. Small territories may be absent at this scale. The previous NASA raster is retained in the repository but no longer rendered.

- `assets/earth.jpg`: NASA Earth Observatory, Blue Marble: Next Generation with Topography, June 2004. [Source and download](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography/). Credit: NASA Earth Observatory; produced by Reto Stöckli. Historical seasonal composite, not live imagery. Clipped to Natural Earth country shapes in an equirectangular projection; coastlines may differ slightly at this overview scale.

- `assets/tuscany.jpg`: [Tuscany landscape view skyline](https://commons.wikimedia.org/wiki/File:Tuscany_landscape_view_skyline.jpg), Free-Photos, CC0 1.0. Illustrates the sample Italy trip; it is not a user photograph.
- Map geometry: `world-atlas` package, derived from Natural Earth public-domain map data. World Atlas code/data packaging is ISC licensed. This is a world overview, not street navigation; small territories may not appear at this resolution.
- App icon: simple directional mark created in code for this project.
