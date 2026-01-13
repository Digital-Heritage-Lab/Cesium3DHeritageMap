// Configuration
const config = {
    ionAccessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMjhiN2RhOC1lYThlLTQ3NGEtYWQ3NC05YjRmOTI5M2M0OWEiLCJpZCI6NzgzODEsImlhdCI6MTcxMDc5ODQ0MH0.nuQD0pwTIy_aHKIqEGLzrhxCCCelkCHyNeJURm3v-Q8",
    monumentsRemoteUrl: 'https://opendem.info/cgi-bin/getDenkmal.py',
    monumentsLocalUrl: 'Data/denkmaeler.json',
    assetsUrl: 'Data/assets.json',
    enable3DTiles: true,
    preferOnlineImagery: true,
    useGooglePhotorealistic: true,
    googlePhotorealisticAssetId: 2275207,
    baseMapDefaultId: 'basemap-libre',
    cologne: {
        longitude: 6.9583,
        latitude: 50.9413,
        height: 35000,
        pitch: -90.0,
        heading: 0.0
    },
    defaultCameraOffset: {
        x: 400,
        y: 50,
        height: 200,
        pitch: -60.0
    }
};

// Cesium Ion access token
Cesium.Ion.defaultAccessToken = config.ionAccessToken;

const enable3DTiles = config.enable3DTiles;
const monumentsRemoteUrl = config.monumentsRemoteUrl;
const monumentsLocalUrl = config.monumentsLocalUrl;
const configuredBaseMapId = config.baseMapDefaultId || 'ion-aerial-labels';
const mapboxAccessToken = (config.mapboxAccessToken || '').trim();
const mapboxStyleId = config.mapboxStyleId || 'streets-v12';
const mapboxUsername = config.mapboxUsername || 'mapbox';
const maplibreRasterUrl = (config.maplibreRasterUrl || '').trim();
const maplibreAttribution = config.maplibreAttribution || 'MapLibre';
const googlePhotorealisticIonAssetId = config.googlePhotorealisticIonAssetId || 2275207;
const googlePhotorealisticCacheBytes = (config.googlePhotorealisticCacheMB || 512) * 1024 * 1024;
const googlePhotorealisticCacheOverflowBytes = (config.googlePhotorealisticCacheOverflowMB || 256) * 1024 * 1024;
const googlePhotorealisticEnableCollision = config.googlePhotorealisticEnableCollision === undefined
    ? false
    : config.googlePhotorealisticEnableCollision;
const googleMapsApiKey = (config.googleMapsApiKey || '').trim();
if (googleMapsApiKey && Cesium.GoogleMaps) {
    Cesium.GoogleMaps.defaultApiKey = googleMapsApiKey;
}
const ionAerialWithLabelsStyle = Cesium.IonWorldImageryStyle
    ? Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
    : undefined;
const ionAerialStyle = Cesium.IonWorldImageryStyle
    ? Cesium.IonWorldImageryStyle.AERIAL
    : undefined;

// Köln lon & lat
const cologneLocation = Cesium.Cartesian3.fromDegrees(
    config.cologne.longitude,
    config.cologne.latitude,
    config.cologne.height
);
const cologneView = {
    destination: cologneLocation,
    orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(config.cologne.pitch),
        roll: 0.0
    }
};

let viewer = null;
let currentBaseLayer = null;
let currentBaseMapId = null;
let baseMapSwitchToken = 0;
let googlePhotorealisticTileset = null;
let googlePhotorealisticTilesetPromise = null;
let googlePhotorealisticSwitchToken = 0;
let osmBuildingsTileset = null;

async function createTerrainProvider() {
    if (!enable3DTiles) {
        return new Cesium.EllipsoidTerrainProvider();
    }

    if (Cesium.createWorldTerrainAsync) {
        try {
            return await Cesium.createWorldTerrainAsync();
        } catch (error) {
            console.warn('Terrain provider failed, continuing without terrain.', error);
            return new Cesium.EllipsoidTerrainProvider();
        }
    }

    if (Cesium.createWorldTerrain) {
        return Cesium.createWorldTerrain();
    }

    return new Cesium.EllipsoidTerrainProvider();
}

async function createOnlineImageryProvider(styleOverride) {
    const style = styleOverride !== undefined ? styleOverride : ionAerialWithLabelsStyle;
    if (Cesium.createWorldImageryAsync) {
        return await Cesium.createWorldImageryAsync(
            style ? { style: style } : undefined
        );
    }

    if (Cesium.createWorldImagery) {
        return Cesium.createWorldImagery(
            style ? { style: style } : undefined
        );
    }

    return null;
}

function hasMapboxToken() {
    return mapboxAccessToken.length > 0;
}

async function createOsmImageryProvider() {
    return new Cesium.UrlTemplateImageryProvider({
        url: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        credit: '© OpenStreetMap contributors, © CARTO'
    });
}

function createMapboxImageryProvider() {
    if (!hasMapboxToken()) {
        return null;
    }

    const styleId = mapboxStyleId || 'streets-v12';
    const username = mapboxUsername || 'mapbox';
    const url = `https://api.mapbox.com/styles/v1/${username}/${styleId}/tiles/256/{z}/{x}/{y}?access_token=${mapboxAccessToken}`;

    return new Cesium.UrlTemplateImageryProvider({
        url: url,
        credit: 'Mapbox'
    });
}

function createBasemapLibreProvider() {
    return new Cesium.UrlTemplateImageryProvider({
        url: 'https://tiles.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        credit: '© OpenStreetMap contributors, © CARTO'
    });
}

const baseMapCatalog = {
    'ion-aerial-labels': {
        label: 'Cesium Aerial (Labels)',
        createProvider: () => createOnlineImageryProvider(ionAerialWithLabelsStyle)
    },
    'ion-aerial': {
        label: 'Cesium Aerial',
        createProvider: () => createOnlineImageryProvider(ionAerialStyle)
    },
    'google-photorealistic': {
        label: 'Google Photorealistic 3D',
        createProvider: () => createOnlineImageryProvider(ionAerialStyle || ionAerialWithLabelsStyle)
    },
    osm: {
        label: 'OpenStreetMap',
        createProvider: createOsmImageryProvider
    },
    'mapbox-streets': {
        label: 'Mapbox Streets v12',
        createProvider: createMapboxImageryProvider
    },
    'basemap-libre': {
        label: 'Basemap Libre',
        createProvider: createBasemapLibreProvider
    }
};

function getFallbackBaseMapId() {
    return 'ion-aerial-labels';
}

function resolveBaseMapId(requestedId) {
    const fallbackId = getFallbackBaseMapId();
    if (!requestedId || !baseMapCatalog[requestedId]) {
        return fallbackId;
    }
    if (requestedId === 'mapbox-streets' && !hasMapboxToken()) {
        return fallbackId;
    }

    return requestedId;
}

async function createImageryProvider() {
    try {
        return await createOnlineImageryProvider();
    } catch (error) {
        console.warn('Cesium ion imagery failed.', error);
        return null;
    }
}

async function createBaseLayerFromId(baseMapId) {
    const entry = baseMapCatalog[baseMapId];
    if (!entry) {
        return null;
    }
    const provider = await entry.createProvider();
    if (!provider) {
        return null;
    }
    return Cesium.ImageryLayer.fromProviderAsync(provider);
}

async function createBaseLayer() {
    const resolvedId = resolveBaseMapId(configuredBaseMapId);
    const baseLayer = await createBaseLayerFromId(resolvedId);
    if (baseLayer) {
        currentBaseMapId = resolvedId;
        return baseLayer;
    }

    const fallbackProvider = await createImageryProvider();
    if (!fallbackProvider) {
        return null;
    }
    currentBaseMapId = getFallbackBaseMapId();
    return Cesium.ImageryLayer.fromProviderAsync(fallbackProvider);
}

function setupImageryFallback(viewerInstance, imageryProvider, fallbackFactory) {
    if (!imageryProvider || !imageryProvider.errorEvent || !fallbackFactory) {
        return;
    }

    let errorCount = 0;
    let didFallback = false;
    imageryProvider.errorEvent.addEventListener(() => {
        errorCount += 1;
        if (didFallback || errorCount < 3) {
            return;
        }

        didFallback = true;
        console.warn('Switching imagery fallback after repeated tile errors.');
        Promise.resolve(fallbackFactory())
            .then((fallbackProvider) => {
                if (!fallbackProvider) {
                    return;
                }
                viewerInstance.imageryLayers.removeAll();
                viewerInstance.imageryLayers.addImageryProvider(fallbackProvider);
            })
            .catch((error) => {
                console.warn('Imagery fallback failed.', error);
            });
    });
}

function setupImageryFallbackForLayer(viewerInstance, imageryLayer) {
    if (!imageryLayer) {
        return;
    }

    const applyFallback = (provider) => {
        setupImageryFallback(viewerInstance, provider, createOnlineImageryProvider);
    };

    if (imageryLayer.readyEvent) {
        const removeReadyListener = imageryLayer.readyEvent.addEventListener((provider) => {
            removeReadyListener();
            applyFallback(provider || imageryLayer.imageryProvider);
        });
        return;
    }

    applyFallback(imageryLayer.imageryProvider);
}

async function createGooglePhotorealisticTileset() {
    const options = {
        cacheBytes: googlePhotorealisticCacheBytes,
        maximumCacheOverflowBytes: googlePhotorealisticCacheOverflowBytes,
        enableCollision: googlePhotorealisticEnableCollision
    };

    if (!googlePhotorealisticIonAssetId) {
        throw new Error('Google Photorealistic 3D tileset is unavailable.');
    }

    if (Cesium.Cesium3DTileset && Cesium.Cesium3DTileset.fromIonAssetId) {
        return Cesium.Cesium3DTileset.fromIonAssetId(googlePhotorealisticIonAssetId, options);
    }

    if (Cesium.createGooglePhotorealistic3DTileset) {
        return Cesium.createGooglePhotorealistic3DTileset(options);
    }

    const resource = await Cesium.IonResource.fromAssetId(googlePhotorealisticIonAssetId);
    return Cesium.Cesium3DTileset.fromUrl(resource, options);
}

async function loadGooglePhotorealisticTileset() {
    if (googlePhotorealisticTileset) {
        return googlePhotorealisticTileset;
    }
    if (!viewer) {
        return null;
    }
    if (!googlePhotorealisticTilesetPromise) {
        googlePhotorealisticTilesetPromise = createGooglePhotorealisticTileset()
            .then((tileset) => {
                tileset.show = false;
                viewer.scene.primitives.add(tileset);
                googlePhotorealisticTileset = tileset;
                return tileset;
            })
            .catch((error) => {
                console.warn('Google Photorealistic 3D tileset failed to load.', error);
                return null;
            })
            .finally(() => {
                googlePhotorealisticTilesetPromise = null;
            });
    }

    return googlePhotorealisticTilesetPromise;
}

async function setGooglePhotorealisticEnabled(enabled) {
    if (!viewer) {
        return;
    }

    const switchToken = ++googlePhotorealisticSwitchToken;
    if (!enabled) {
        if (viewer.scene && viewer.scene.globe) {
            viewer.scene.globe.show = true;
        }
        if (googlePhotorealisticTileset) {
            googlePhotorealisticTileset.show = false;
        }
        return;
    }

    if (viewer.scene) {
        if (viewer.scene.skyAtmosphere) {
            viewer.scene.skyAtmosphere.show = true;
        }
        if (viewer.scene.globe) {
            viewer.scene.globe.show = false;
        }
    }

    const tileset = await loadGooglePhotorealisticTileset();
    if (switchToken !== googlePhotorealisticSwitchToken) {
        return;
    }
    if (tileset) {
        tileset.show = true;
        if (viewer.scene && viewer.scene.globe) {
            viewer.scene.globe.show = false;
        }
    } else if (viewer.scene && viewer.scene.globe) {
        viewer.scene.globe.show = true;
    }
}

async function loadOsmBuildings() {
    if (osmBuildingsTileset) return osmBuildingsTileset;

    try {
        // Check for Async method first (CESIUM 1.107+)
        if (Cesium.createOsmBuildingsAsync) {
            osmBuildingsTileset = await Cesium.createOsmBuildingsAsync();
        } else {
            // Fallback for older versions
            osmBuildingsTileset = Cesium.createOsmBuildings();
        }

        if (osmBuildingsTileset) {
            // Style: Grey color
            osmBuildingsTileset.style = new Cesium.Cesium3DTileStyle({
                color: "color('gray')"
            });
            osmBuildingsTileset.show = false; // Hidden by default
            viewer.scene.primitives.add(osmBuildingsTileset);
        }
    } catch (e) {
        console.warn('Error loading OSM Buildings:', e);
    }
    return osmBuildingsTileset;
}

function updateBaseMapNote(noteElement, baseMapId) {
    if (!noteElement) {
        return;
    }
    if (!hasMapboxToken() && baseMapId === 'mapbox-streets') {
        noteElement.textContent = 'Mapbox requires an access token in config.js.';
        return;
    }

    if (!googleMapsApiKey && baseMapId === 'google-photorealistic') {
        noteElement.textContent = 'Google Photorealistic needs Cesium ion terms accepted or a Google Maps API key in config.js.';
        return;
    }
    noteElement.textContent = '';
}

async function setBaseLayerById(viewerInstance, baseMapId, noteElement, selectElement) {
    if (!viewerInstance) {
        return;
    }

    const resolvedId = resolveBaseMapId(baseMapId);
    if (selectElement && selectElement.value !== resolvedId) {
        selectElement.value = resolvedId;
    }

    updateBaseMapNote(noteElement, baseMapId);

    const enablePhotorealistic = resolvedId === 'google-photorealistic';
    void setGooglePhotorealisticEnabled(enablePhotorealistic);

    if (resolvedId === currentBaseMapId && currentBaseLayer) {
        return;
    }

    const entry = baseMapCatalog[resolvedId];
    if (!entry) {
        return;
    }

    const switchToken = ++baseMapSwitchToken;
    try {
        const provider = await entry.createProvider();
        if (!provider) {
            throw new Error('Base map provider unavailable.');
        }
        if (switchToken !== baseMapSwitchToken) {
            return;
        }

        const layer = await Cesium.ImageryLayer.fromProviderAsync(provider);
        if (switchToken !== baseMapSwitchToken) {
            return;
        }

        viewerInstance.imageryLayers.removeAll();
        viewerInstance.imageryLayers.add(layer, 0);
        currentBaseLayer = layer;
        currentBaseMapId = resolvedId;
        setupImageryFallbackForLayer(viewerInstance, layer);
    } catch (error) {
        console.warn(`Base map switch failed (${resolvedId}).`, error);
    }
}

function setupBaseMapControls(viewerInstance, baseLayer) {
    const baseMapBox = document.getElementById('baseMapBox');
    const openBaseMapButton = document.getElementById('openBaseMapBox');
    const closeBaseMapButton = document.getElementById('closeBaseMapBox');
    const baseMapSelect = document.getElementById('baseMapSelect');
    const baseMapNote = document.getElementById('baseMapNote');

    if (!baseMapBox || !openBaseMapButton || !closeBaseMapButton || !baseMapSelect) {
        return;
    }

    currentBaseLayer = baseLayer || currentBaseLayer;
    currentBaseMapId = resolveBaseMapId(currentBaseMapId || configuredBaseMapId);

    const mapboxOption = baseMapSelect.querySelector('option[value="mapbox-streets"]');
    if (mapboxOption) {
        mapboxOption.disabled = !hasMapboxToken();
    }


    baseMapSelect.value = currentBaseMapId;
    updateBaseMapNote(baseMapNote, currentBaseMapId);
    void setGooglePhotorealisticEnabled(currentBaseMapId === 'google-photorealistic');

    // Event listeners for open/close are managed centrally in the panel management section
    // Only add the basemap select change listener here
    baseMapSelect.addEventListener('change', () => {
        setBaseLayerById(viewerInstance, baseMapSelect.value, baseMapNote, baseMapSelect);
    });
}



function addIonTileset(assetId, label) {
    if (!assetId || assetId <= 0) {
        return null;
    }

    return Cesium.IonResource.fromAssetId(assetId)
        .then((resource) => Cesium.Cesium3DTileset.fromUrl(resource))
        .then((tileset) => {
            tileset.show = tilesetsVisible;
            viewer.scene.primitives.add(tileset);
            loadedTilesets.push(tileset);
            return tileset;
        })
        .catch((error) => {
            console.warn(`3D tileset failed to load (${label}).`, error);
            return null;
        });
}

function setTilesetsVisible(visible) {
    tilesetsVisible = visible;
    loadedTilesets.forEach((tileset) => {
        tileset.show = visible;
    });
}

// Reduce marker/label clutter and group nearby points.
const markerScaleByDistance = new Cesium.NearFarScalar(1500.0, 1.0, 15000.0, 0.45);
const labelMaxDistance = 2000.0;
const labelDistanceDisplayCondition = new Cesium.DistanceDisplayCondition(0.0, labelMaxDistance);
const labelScaleByDistance = new Cesium.NearFarScalar(200.0, 1.0, labelMaxDistance, 0.0);
const labelTranslucencyByDistance = new Cesium.NearFarScalar(200.0, 1.0, labelMaxDistance, 0.0);
const clusterPixelRange = 40;
const clusterMinimumSize = 3;
const clusterPinBuilder = new Cesium.PinBuilder();
const clusterPinCache = new Map();

let monumentsDataSource = null;
const loadedTilesets = [];
let tilesetsVisible = false;

// Define radio buttons for different entity types
const radios = {
    viewer3d: document.getElementById('viewer3d'),
    model3d: document.getElementById('3dmodel'),
    photo: document.getElementById('photo'),
    wikipedia: document.getElementById('wikipedia'),
    openstreetmap: document.getElementById('filter_openstreetmap'),
    allMarkers: document.getElementById('allMarkers')
};

// Add event listeners to radio buttons
for (const radioId in radios) {
    radios[radioId].addEventListener('change', () => {
        // Update active class on labels
        const labels = document.querySelectorAll('#optionsBox label');
        labels.forEach(label => {
            // Helper: Don't clear active state from checkbox labels (like LOD Data)
            if (!label.querySelector('input[type="checkbox"]')) {
                label.classList.remove('active');
            }
        });
        const activeLabel = radios[radioId].closest('label');
        if (activeLabel) {
            activeLabel.classList.add('active');
        }

        updateEntities(radioId);
    });

}

// Setup independent LOD Data toggle (Checkbox)
const lodCheckbox = document.getElementById('lodData');
if (lodCheckbox) {
    lodCheckbox.addEventListener('change', (e) => {
        if (osmBuildingsTileset) {
            osmBuildingsTileset.show = e.target.checked;
        }

        const label = lodCheckbox.closest('label');
        if (label) {
            if (e.target.checked) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        }
    });
}

// Setup independent Google Photorealistic toggle (Checkbox)
const googleCheckbox = document.getElementById('googlePhotorealistic');
if (googleCheckbox) {
    googleCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            const select = document.getElementById('baseMapSelect');
            if (select) {
                select.value = 'google-photorealistic';
                select.dispatchEvent(new Event('change'));
            }
            // Deactivate LOD if Google is on
            if (lodCheckbox && lodCheckbox.checked) {
                lodCheckbox.click();
            }
        }

        const label = googleCheckbox.closest('label');
        if (label) {
            if (e.target.checked) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        }
    });
}

function getEntityFlags(entity) {
    if (entity.heritageFlags) {
        return entity.heritageFlags;
    }

    const properties = entity.properties || {};
    const monumentId = getMonumentId(entity);
    const hasTileset = monumentId !== null && monumentId !== undefined
        ? assetsByMonument.has(String(monumentId))
        : false;
    const flags = {
        viewer3d: (properties.viewer3d && properties.viewer3d.getValue() === 'ja') || hasTileset,
        model3d: properties.model3d && properties.model3d.getValue() === 'ja',
        photo: properties.foto && properties.foto.getValue() === 'ja',
        wiki: properties.wiki && properties.wiki.getValue() === 'ja',
        osm: properties.osm && properties.osm.getValue() === 'ja'
    };

    entity.heritageFlags = flags;
    return flags;
}

function getMonumentId(entity) {
    if (entity.heritageMonumentId !== undefined) {
        return entity.heritageMonumentId;
    }

    const properties = entity.properties || {};
    const monumentId = properties.denkmallistennummer ? properties.denkmallistennummer.getValue() : null;
    entity.heritageMonumentId = monumentId;
    return monumentId;
}

function getNumericValue(value) {
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function applyAssetPosition(entity, asset, now) {
    if (!asset || !entity.position) {
        return;
    }

    const currentPosition = entity.position.getValue(now);
    if (!currentPosition) {
        return;
    }

    let x = currentPosition.x;
    let y = currentPosition.y;
    let z = currentPosition.z;

    const assetX = getNumericValue(asset.xcoord);
    const assetY = getNumericValue(asset.ycoord);
    const assetZ = getNumericValue(asset.zcoord);

    if (assetX !== null) {
        x = assetX;
    }
    if (assetY !== null) {
        y = assetY;
    }
    if (assetZ !== null) {
        z = assetZ;
    }

    if (x === currentPosition.x && y === currentPosition.y && z === currentPosition.z) {
        return;
    }

    entity.position = new Cesium.ConstantPositionProperty(new Cesium.Cartesian3(x, y, z));
}

/**
 * Function to update the visibility of entities based on the selected radio button.
 * @param {string} radioId - The id of the selected radio button.
 */
function updateEntities(radioId) {
    const showTilesets = radioId === 'viewer3d' || radioId === 'allMarkers';
    setTilesetsVisible(showTilesets);



    if (!monumentsDataSource) {
        return;
    }

    const entities = monumentsDataSource.entities.values;

    entities.forEach(entity => {
        let isVisible = false;
        const flags = getEntityFlags(entity);

        switch (radioId) {
            case 'viewer3d':
                isVisible = flags.viewer3d;
                break;
            case 'model3d':
                isVisible = flags.model3d;
                break;
            case 'photo':
                isVisible = flags.photo;
                break;
            case 'wikipedia':
                isVisible = flags.wiki;
                break;
            case 'openstreetmap':
                isVisible = flags.osm;
                break;
            case 'allMarkers':
                isVisible = true; // Show all markers
                break;
            default:
                break;
        }

        entity.show = isVisible; // Update entity visibility
    });

}

/**
 * Function to load GeoJSON data and add it to the viewer. *
 */
let markersInitialized = false; // Markers will only be loaded once

function getClusterPin(count) {
    const label = count.toString();
    const digits = label.length;
    const size = digits === 1 ? 42 : digits === 2 ? 50 : digits === 3 ? 58 : 66;
    const cacheKey = `${label}-${size}`;

    if (!clusterPinCache.has(cacheKey)) {
        const pin = clusterPinBuilder.fromText(label, Cesium.Color.fromCssColorString('#e11d2e'), size);
        clusterPinCache.set(cacheKey, pin.toDataURL());
    }

    return clusterPinCache.get(cacheKey);
}

function configureClustering(dataSource) {
    dataSource.clustering.enabled = true;
    dataSource.clustering.pixelRange = clusterPixelRange;
    dataSource.clustering.minimumClusterSize = clusterMinimumSize;

    dataSource.clustering.clusterEvent.addEventListener((clusteredEntities, cluster) => {
        cluster.label.show = false;
        cluster.billboard.show = true;
        cluster.billboard.image = getClusterPin(clusteredEntities.length);
        cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
        const clusterId = {
            heritageCluster: true,
            entities: clusteredEntities
        };
        cluster.billboard.id = clusterId;
        cluster.label.id = clusterId;
    });
}

function zoomToClusterEntities(clusteredEntities) {
    if (!clusteredEntities || clusteredEntities.length === 0) {
        return;
    }

    const now = Cesium.JulianDate.now();
    const positions = clusteredEntities
        .map(entity => (entity.position ? entity.position.getValue(now) : null))
        .filter(position => position);

    if (positions.length === 0) {
        return;
    }

    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 1.2
    });
}

async function loadGeoJsonDataSource() {
    const sources = [monumentsRemoteUrl, monumentsLocalUrl];
    let lastError = null;

    for (const source of sources) {
        if (!source) {
            continue;
        }

        try {
            return await Cesium.GeoJsonDataSource.load(source);
        } catch (error) {
            console.warn(`GeoJSON load failed (${source}).`, error);
            lastError = error;
        }
    }

    throw lastError || new Error('No GeoJSON sources available.');
}

async function loadGeoJson() {
    try {
        if (markersInitialized) return; // If markers are already loaded, do not load again

        const dataSource = await loadGeoJsonDataSource();

        await viewer.dataSources.add(dataSource);
        monumentsDataSource = dataSource;
        configureClustering(dataSource);

        if (assetsReady) {
            await assetsReady;
        }

        const entities = dataSource.entities.values;
        const now = Cesium.JulianDate.now();

        // Use DocumentFragment for performance when updating StoryMap Box
        const storyMapBox = document.getElementById('storyMapBox');
        const fragment = document.createDocumentFragment();
        const header = document.createElement('h2');
        header.textContent = 'Story Mapping';
        fragment.appendChild(header);

        let storyItems = 0;

        // Create "Kölner Dom" special item
        const domItem = document.createElement('div');
        domItem.className = 'story-item';
        domItem.innerHTML = '<strong>Kölner Dom</strong><br><span style="font-size:0.85em; opacity:0.8">3D Experience</span>';

        domItem.onclick = () => {
            // Switch to Google Photorealistic
            const baseMapSelect = document.getElementById('baseMapSelect');
            const baseMapNote = document.getElementById('baseMapNote');
            setBaseLayerById(viewer, 'google-photorealistic', baseMapNote, baseMapSelect);

            // Fly to Kölner Dom from 500m South
            // Cathedral is approx at 50.9413, so 500m south is roughly 50.9368 (-0.0045 deg)
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(6.9583, 50.9368, 400),
                orientation: {
                    heading: Cesium.Math.toRadians(0.0), // Look North
                    pitch: Cesium.Math.toRadians(-30.0),
                    roll: 0.0
                },
                duration: 2.5
            });

            // Close panel on mobile/small screens if needed, or just keep open
        };
        fragment.appendChild(domItem);


        entities.forEach(entity => {
            if (entity.position) {
                const properties = entity.properties || {};
                const name = properties.kurzbezeichnung ? properties.kurzbezeichnung.getValue() : '';

                // Define the marker
                entity.billboard = new Cesium.BillboardGraphics({
                    image: 'Images/marker.png',
                    width: 32,
                    height: 32,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    scaleByDistance: markerScaleByDistance
                });

                // Define the marker label
                entity.label = new Cesium.LabelGraphics({
                    text: name,
                    font: '12px "Segoe UI", Arial, sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -36),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.6),
                    backgroundPadding: new Cesium.Cartesian2(6, 4),
                    distanceDisplayCondition: labelDistanceDisplayCondition,
                    scaleByDistance: labelScaleByDistance,
                    translucencyByDistance: labelTranslucencyByDistance
                });

                // If the viewer3d property is "ja", append its kurzbezeichnung to the story map box
                const flags = getEntityFlags(entity);
                if (flags.viewer3d) {
                    const monumentId = getMonumentId(entity);
                    if (monumentId !== null && monumentId !== undefined) {
                        const asset = assetsByMonument.get(String(monumentId));
                        applyAssetPosition(entity, asset, now);
                    }

                    const kurzbezeichnung = properties.kurzbezeichnung ? properties.kurzbezeichnung.getValue() : 'No name available';
                    const pElement = document.createElement('p');
                    pElement.textContent = kurzbezeichnung;
                    storyItems += 1;

                    // Add click event to each name that moves the camera to the entity's position
                    pElement.addEventListener('click', () => {
                        // REVERT to default basemap if we are in Google mode (assuming user didn't manually switch)
                        // We simply force switch back to default if currently Google
                        if (currentBaseMapId === 'google-photorealistic') {
                            const baseMapSelect = document.getElementById('baseMapSelect');
                            const baseMapNote = document.getElementById('baseMapNote');
                            setBaseLayerById(viewer, config.baseMapDefaultId, baseMapNote, baseMapSelect);
                        }

                        const markerPosition = entity.position.getValue(Cesium.JulianDate.now());

                        // Use config for camera offsets
                        const offset = config.defaultCameraOffset;
                        const cameraPosition = new Cesium.Cartesian3(
                            markerPosition.x + offset.x,
                            markerPosition.y + offset.y,
                            markerPosition.z + offset.height
                        );

                        viewer.camera.flyTo({
                            destination: cameraPosition,
                            orientation: {
                                heading: Cesium.Math.toRadians(0.0),
                                pitch: Cesium.Math.toRadians(offset.pitch),
                                roll: 0.0
                            },
                            duration: 3
                        });
                    });

                    fragment.appendChild(pElement);
                }
            }
        });

        if (storyItems === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'No 3D objects found.';
            fragment.appendChild(emptyMessage);
        }

        // Finalize StoryMapBox
        storyMapBox.innerHTML = '';
        storyMapBox.appendChild(fragment);

        // Mark that markers are loaded
        markersInitialized = true;

        // Apply the selected filter initially
        const selectedRadio = Object.keys(radios).find(key => radios[key].checked);
        updateEntities(selectedRadio);

    } catch (error) {
        console.error(error);
        const storyMapBox = document.getElementById('storyMapBox');
        if (storyMapBox) {
            storyMapBox.innerHTML = '<h2>Story Mapping</h2><p>Unable to load monument data.</p>';
        }
    }
}



// use html Parameters if available and zoom to location

/**
 * Function to retrieve URL parameters.
 * @param {string} name - The name of the parameter to retrieve.
 * @returns {string} - The value of the parameter.
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * Loads 3D asset data from 'assets.json' and monument data from
 * 'denkmaeler.json'. It adds a default 3D Tileset using a fixed
 * asset ID and appends corresponding assets to the Cesium viewer
 * based on matching monument numbers.
 */
const assetsUrl = config.assetsUrl;
const denkmaelerUrl = monumentsRemoteUrl;

let assets = [];
const assetsByMonument = new Map();
let assetsReady = null;

function loadAssets() {
    if (!enable3DTiles) {
        return Promise.resolve();
    }

    const fetchJson = (url) => {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network error: ' + response.statusText);
                }
                return response.json();
            });
    };

    const fetchMonumentsData = () => {
        return fetchJson(denkmaelerUrl).catch((error) => {
            console.warn('Remote monument data failed, using local.', error);
            return fetchJson(monumentsLocalUrl);
        });
    };

    // Load the first JSON file
    return fetchJson(assetsUrl)
        .then(data => {
            assets = Array.isArray(data.assets) ? data.assets : [];
            assetsByMonument.clear();
            assets.forEach(asset => {
                if (asset && asset.denkmallistennummer) {
                    assetsByMonument.set(String(asset.denkmallistennummer), asset);
                }
            });

            // Load the second JSON file
            return fetchMonumentsData()
                .then(denkmaelerData => {
                    const features = denkmaelerData.features;
                    if (!Array.isArray(features)) {
                        throw new Error('Features is not an array');
                    }

                    const denkmaelerMap = {};
                    features.forEach(item => {
                        if (item.properties && item.properties.denkmallistennummer) {
                            const denkmallistennummer = item.properties.denkmallistennummer;
                            denkmaelerMap[denkmallistennummer] = item;
                        }
                    });

                    // Add Google Photorealistic 3D Tiles if enabled - REMOVED (Handled by Basemap logic)
                    // if (config.useGooglePhotorealistic && config.googlePhotorealisticAssetId) {
                    //     addIonTileset(config.googlePhotorealisticAssetId, 'Google Photorealistic 3D');
                    // }

                    // Add default heritage tileset - REMOVED (Replaced by LOD Data layer)
                    // addIonTileset(96188, 'default');

                    // Check elements from the assets array and add them if there is a match
                    assets.forEach(asset => {
                        const denkmallistennummer = asset.denkmallistennummer;

                        // If denkmallistennummer exists and there is a match, add it
                        if (denkmallistennummer && denkmaelerMap[denkmallistennummer]) {
                            addIonTileset(asset.id, denkmallistennummer);
                        }
                    });
                });
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

async function initViewer() {
    const [terrainProvider, baseLayer] = await Promise.all([
        createTerrainProvider(),
        createBaseLayer()
    ]);
    const viewerOptions = {
        baseLayer: baseLayer,
        baseLayerPicker: false,
        sceneModePicker: false,
        navigationHelpButton: false
    };

    if (terrainProvider) {
        viewerOptions.terrainProvider = terrainProvider;
    }

    viewer = new Cesium.Viewer("cesiumContainer", viewerOptions);
    setupImageryFallbackForLayer(viewer, baseLayer);
    currentBaseLayer = baseLayer;
    setupBaseMapControls(viewer, baseLayer);
    const cameraController = viewer.scene.screenSpaceCameraController;
    cameraController.enableInputs = true;
    cameraController.enableRotate = true;
    cameraController.enableZoom = true;
    cameraController.enableTilt = true;
    cameraController.enableLook = true;
    cameraController.enableTranslate = true;

    viewer.camera.setView(cologneView);

    if (viewer.homeButton && viewer.homeButton.viewModel) {
        viewer.homeButton.viewModel.command.beforeExecute.addEventListener((commandInfo) => {
            commandInfo.cancel = true;
            viewer.camera.flyTo({
                destination: cologneView.destination,
                orientation: cologneView.orientation,
                duration: 1.6
            });
        });
    }

    // Enable 3D lighting
    viewer.scene.globe.enableLighting = true;

    assetsReady = loadAssets();
    loadOsmBuildings(); // Start loading building data

    const loadingScreen = document.getElementById('loadingScreen');

    function hideLoading() {
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            loadingScreen.style.display = 'none';
            loadGeoJson();
        }
    }

    // Default: use globe tile listener
    const removeTileListener = viewer.scene.globe.tileLoadProgressEvent.addEventListener((count) => {
        if (count === 0) {
            removeTileListener();
            hideLoading();
        }
    });

    // Fallback: if globe is hidden (Google Photorealistic) or if load takes too long
    setTimeout(hideLoading, 5000);

    const lat = getUrlParameter('lat');
    const lon = getUrlParameter('lon');

    if (lat && lon) {
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(parseFloat(lon), parseFloat(lat - 0.001), 200),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-45.0),
                roll: 0
            },
            duration: 3
        });
    }

    // Add event listener for click events on the map
    viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
        const pickedObject = viewer.scene.pick(movement.position);
        if (!Cesium.defined(pickedObject)) {
            return;
        }

        const pickedId = pickedObject.id || (pickedObject.primitive && pickedObject.primitive.id);
        if (pickedId && pickedId.heritageCluster) {
            zoomToClusterEntities(pickedId.entities);
            return;
        }

        if (Cesium.defined(pickedId)) {
            showEntityInfo(pickedId);
            // Use central panel management to ensure exclusivity
            openPanel('info');
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Move the camera to the marker on double-click
    viewer.screenSpaceEventHandler.setInputAction(function onDoubleClick(movement) {
        const pickedObject = viewer.scene.pick(movement.position);
        if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
            const entity = pickedObject.id;
            const markerPosition = entity.position.getValue(Cesium.JulianDate.now());

            const offset = config.defaultCameraOffset;
            let x = offset.x;
            let y = offset.y;
            let heightOffset = offset.height;

            const monumentId = getMonumentId(pickedObject.id);
            if (monumentId !== null && monumentId !== undefined) {
                const asset = assetsByMonument.get(String(monumentId));
                if (asset) {
                    const offsetX = getNumericValue(asset.x);
                    const offsetY = getNumericValue(asset.y);
                    const offsetHeight = getNumericValue(asset.heightOffset);
                    if (offsetX !== null) x = offsetX;
                    if (offsetY !== null) y = offsetY;
                    if (offsetHeight !== null) heightOffset = offsetHeight;
                }
            }

            const cameraPosition = new Cesium.Cartesian3(
                markerPosition.x + x,
                markerPosition.y + y,
                markerPosition.z + heightOffset
            );

            viewer.camera.flyTo({
                destination: cameraPosition,
                orientation: {
                    heading: Cesium.Math.toRadians(0.0),
                    pitch: Cesium.Math.toRadians(offset.pitch),
                    roll: 0.0
                },
                duration: 3
            });
        }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
}

/**
 * Function to show information for a clicked entity.
 * @param {Cesium.Entity} entity - The clicked entity.
 */
function showEntityInfo(entity) {
    const infoBox = document.getElementById('entityInfo');
    const appInfo = document.getElementById('appInfo'); // Get generic app info
    if (!infoBox) return;

    // Hide generic info when showing entity details
    if (appInfo && entity) {
        appInfo.style.display = 'none';
    } else if (appInfo && !entity) {
        appInfo.style.display = 'block';
    }

    infoBox.innerHTML = '';
    if (!entity || !entity.properties) return;

    const propertiesToShow = ['denkmallistennummer', 'kategorie', 'kurzbezeichnung', 'baujahr'];
    propertiesToShow.forEach(property => {
        if (entity.properties[property]) {
            const value = entity.properties[property].getValue();
            const div = document.createElement('div');
            div.className = 'info-item';
            div.innerHTML = `<strong>${property}:</strong> ${value}`;
            infoBox.appendChild(div);
        }
    });

    const controls = [
        { prop: 'wiki', urlProp: 'wikiurl', label: 'Wikipedia' },
        { prop: 'model3d', urlProp: 'model3durl', label: '3D Model' },
        // Foto button removed as it is now shown automatically
        { prop: 'osm', urlProp: 'osmurl', label: 'OpenStreetMap' }
    ];

    controls.forEach(control => {
        if (entity.properties[control.prop]) {
            const flag = entity.properties[control.prop].getValue();
            const isEnabled = typeof flag === 'string' ? flag.toLowerCase() === 'ja' : Boolean(flag);
            if (!isEnabled) return;

            const button = document.createElement('button');
            button.textContent = control.label;

            // Default behavior for links
            button.onclick = () => {
                const url = entity.properties[control.urlProp].getValue();
                if (!url) return;
                window.open(url, '_blank', 'noopener,noreferrer');
            };

            infoBox.appendChild(button);
        }
    });

    // Automatically display photo if available
    if (entity.properties.fotourl) {
        const url = entity.properties.fotourl.getValue();
        if (url) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'entity-image-container';
            imgContainer.style.marginTop = '15px';
            imgContainer.style.textAlign = 'center';
            // Added clickable image to open full size
            imgContainer.innerHTML = `<img src="${url}" alt="Denkmal Foto" title="Click to enlarge" style="max-width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer;" onclick="window.open('${url}', '_blank')">`;
            infoBox.appendChild(imgContainer);
        }
    }
}

// Event Listeners
// ========== IMPROVED PANEL MANAGEMENT ==========
// Centralized panel management - only one panel open at a time
const panels = {
    options: { panel: 'optionsBox', button: 'openOptionsBox' },
    storymap: { panel: 'storyMapBox', button: 'openStoryMapBox' },
    basemap: { panel: 'baseMapBox', button: 'openBaseMapBox' },
    info: { panel: 'infoBox', button: 'openInfoBox' },
    aichat: { panel: 'aiChatPanel', button: 'toggleAiChat' }
};

let currentOpenPanel = null;

function closeAllPanels() {
    Object.values(panels).forEach(({ panel, button, relatedPanel }) => {
        const panelEl = document.getElementById(panel);
        const buttonEl = document.getElementById(button);

        if (panelEl) panelEl.style.display = 'none';
        if (buttonEl) buttonEl.classList.remove('active');

        // Also close related panels
        if (relatedPanel) {
            const relatedEl = document.getElementById(relatedPanel);
            if (relatedEl) relatedEl.style.display = 'none';
        }
    });
    currentOpenPanel = null;
}

function openPanel(panelKey) {
    const panelConfig = panels[panelKey];
    if (!panelConfig) return;

    const { panel, button, relatedPanel } = panelConfig;
    const panelEl = document.getElementById(panel);
    const buttonEl = document.getElementById(button);

    // Close all panels first
    closeAllPanels();

    // Open the requested panel
    if (panelEl) {
        panelEl.style.display = 'block';
        panelEl.style.animation = 'panel-enter 0.3s ease';
    }
    if (buttonEl) buttonEl.classList.add('active');

    // Open related panel if exists (like storyMap for options)
    if (relatedPanel) {
        const relatedEl = document.getElementById(relatedPanel);
        if (relatedEl) {
            relatedEl.style.display = 'block';
            relatedEl.style.animation = 'panel-enter 0.3s ease 0.1s';
        }
    }

    currentOpenPanel = panelKey;
}

function togglePanel(panelKey) {
    if (currentOpenPanel === panelKey) {
        closeAllPanels();
    } else {
        openPanel(panelKey);
    }
}

// Setup event listeners for all panels
document.getElementById('openOptionsBox').onclick = () => {
    togglePanel('options');
};

document.getElementById('closeOptionsBox').onclick = () => {
    closeAllPanels();
};

document.getElementById('openStoryMapBox').onclick = () => {
    togglePanel('storymap');
};

document.getElementById('closeStoryMapBox').onclick = () => {
    closeAllPanels();
};

document.getElementById('openBaseMapBox').onclick = () => {
    togglePanel('basemap');
};

document.getElementById('closeBaseMapBox').onclick = () => {
    closeAllPanels();
};

document.getElementById('openInfoBox').onclick = () => {
    togglePanel('info');
};

document.getElementById('closeInfoBox').onclick = () => {
    closeAllPanels();
};

document.getElementById('toggleAiChat').onclick = () => {
    // Initialize if not already (lazy load or just ensure it exists)
    if (!window.aiChatInstance && typeof HeritageAIChat !== 'undefined' && viewer) {
        window.aiChatInstance = new HeritageAIChat(viewer);

        // Override the close button behavior to use our central panel manager
        const closeBtn = document.getElementById('closeAiChatPanel');
        if (closeBtn) {
            closeBtn.onclick = () => {
                closeAllPanels();
            };
        }
    }
    togglePanel('aichat');
};

initViewer().catch((error) => {
    console.error('Cesium initialization failed:', error);
});
