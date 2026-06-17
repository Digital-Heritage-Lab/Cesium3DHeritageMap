// Configuration
// SECURITY: All Ion access tokens below are shipped to every browser. They MUST be
// referer-restricted in the Cesium Ion console (Access Tokens -> Allowed URLs) to the
// production Netlify domain (and any staging domains). Rotate here if any restriction
// is missing or if a token is suspected of being abused.
const config = {
    ionAccessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMjhiN2RhOC1lYThlLTQ3NGEtYWQ3NC05YjRmOTI5M2M0OWEiLCJpZCI6NzgzODEsImlhdCI6MTcxMDc5ODQ0MH0.nuQD0pwTIy_aHKIqEGLzrhxCCCelkCHyNeJURm3v-Q8",
    lod2WestIonAssetId: 4382415,
    lod2WestIonToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyNGNjZmZhMi0wYWZjLTRmOTUtYTkxMi00NTVmODhjMDlkNjkiLCJpZCI6MzgzMjY1LCJpYXQiOjE3Njk0NDEzMzN9.R2m7MFamEMTiO81VChtkLLhlEVgfHNv-qXoQDZ-fe0c",
    lod2EastIonAssetId: 4383827,
    lod2EastIonToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjZmY3NTE0Ni00MjQ4LTRiMjAtYTJiYy1jODdmMWYxMGQ2OWIiLCJpZCI6MzgzNDA1LCJpYXQiOjE3Njk0MDg4ODZ9.eZr19bHXXVcMk9_E_JasN6tfzubdu_qsJa2j41BpgXI",
    monumentsRemoteUrl: 'https://opendem.info/cgi-bin/getDenkmal.py',
    monumentsLocalUrl: 'Data/denkmaeler.json',
    assetsUrl: 'Data/assets.json',
    enable3DTiles: true,
    eagerLoadOptionalTilesets: false,
    showTilesetsWithAllMarkers: false,
    deferGooglePhotorealisticUntilInteractive: true,
    remoteMonumentFetchTimeoutMs: 3500,
    showCesiumTimeControls: false,
    preferOnlineImagery: true,
    useGooglePhotorealistic: true,
    googlePhotorealisticAssetId: 2275207,
    baseMapDefaultId: 'ion-aerial-labels',
    baseMapFallbackId: 'ion-aerial-labels',
    googlePhotorealisticStartupTimeoutMs: 7000,
    googlePhotorealisticAutoStart: false,
    googlePhotorealisticInitialMaximumScreenSpaceError: 64,
    googlePhotorealisticRefinedMaximumScreenSpaceError: 32,
    googlePhotorealisticCacheMB: 384,
    googlePhotorealisticCacheOverflowMB: 128,
    googlePhotorealisticMobileCacheMB: 96,
    googlePhotorealisticMobileCacheOverflowMB: 32,
    googlePhotorealisticEnableCollision: false,
    cologne: {
        longitude: 6.9799,
        latitude: 50.9360,
        height: 430,
        heading: 292.0,
        pitch: -15.0
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

function getConfigNumber(value, fallback) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
}

function shouldUseMobileGooglePhotorealisticBudget() {
    const isSmallViewport = window.matchMedia
        ? window.matchMedia('(max-width: 767px)').matches
        : false;
    const deviceMemory = navigator.deviceMemory ? Number(navigator.deviceMemory) : Number.POSITIVE_INFINITY;
    const isLowMemoryDevice = Number.isFinite(deviceMemory) && deviceMemory > 0 && deviceMemory <= 4;

    return isSmallViewport || isLowMemoryDevice;
}

const enable3DTiles = config.enable3DTiles;
const monumentsRemoteUrl = config.monumentsRemoteUrl;
const monumentsLocalUrl = config.monumentsLocalUrl;
const configuredBaseMapId = config.baseMapDefaultId || 'ion-aerial-labels';
const configuredBaseMapFallbackId = config.baseMapFallbackId || 'ion-aerial-labels';
const mapboxAccessToken = (config.mapboxAccessToken || '').trim();
const mapboxStyleId = config.mapboxStyleId || 'streets-v12';
const mapboxUsername = config.mapboxUsername || 'mapbox';
const maplibreRasterUrl = (config.maplibreRasterUrl || '').trim();
const maplibreAttribution = config.maplibreAttribution || 'MapLibre';
const eagerLoadOptionalTilesets = config.eagerLoadOptionalTilesets === true;
const showTilesetsWithAllMarkers = config.showTilesetsWithAllMarkers === true;
const deferGooglePhotorealisticUntilInteractive = config.deferGooglePhotorealisticUntilInteractive !== false;
const remoteMonumentFetchTimeoutMs = Number.isFinite(Number(config.remoteMonumentFetchTimeoutMs))
    ? Number(config.remoteMonumentFetchTimeoutMs)
    : 3500;
const showCesiumTimeControls = config.showCesiumTimeControls === true;
const googlePhotorealisticIonAssetId = config.googlePhotorealisticIonAssetId || config.googlePhotorealisticAssetId || 2275207;
const googlePhotorealisticAutoStart = config.googlePhotorealisticAutoStart !== false;
const googlePhotorealisticStartupTimeoutMs = Number.isFinite(Number(config.googlePhotorealisticStartupTimeoutMs))
    ? Number(config.googlePhotorealisticStartupTimeoutMs)
    : 7000;
const fallbackGooglePhotorealisticMaximumScreenSpaceError = getConfigNumber(
    config.googlePhotorealisticMaximumScreenSpaceError,
    32
);
const googlePhotorealisticInitialMaximumScreenSpaceError = getConfigNumber(
    config.googlePhotorealisticInitialMaximumScreenSpaceError,
    Math.max(fallbackGooglePhotorealisticMaximumScreenSpaceError, 48)
);
const googlePhotorealisticRefinedMaximumScreenSpaceError = getConfigNumber(
    config.googlePhotorealisticRefinedMaximumScreenSpaceError,
    fallbackGooglePhotorealisticMaximumScreenSpaceError
);
const useMobileGooglePhotorealisticBudget = shouldUseMobileGooglePhotorealisticBudget();
const googlePhotorealisticCacheMB = useMobileGooglePhotorealisticBudget
    ? getConfigNumber(config.googlePhotorealisticMobileCacheMB, 96)
    : getConfigNumber(config.googlePhotorealisticCacheMB, 384);
const googlePhotorealisticCacheOverflowMB = useMobileGooglePhotorealisticBudget
    ? getConfigNumber(config.googlePhotorealisticMobileCacheOverflowMB, 32)
    : getConfigNumber(config.googlePhotorealisticCacheOverflowMB, 128);
const googlePhotorealisticCacheBytes = googlePhotorealisticCacheMB * 1024 * 1024;
const googlePhotorealisticCacheOverflowBytes = googlePhotorealisticCacheOverflowMB * 1024 * 1024;
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
        heading: Cesium.Math.toRadians(config.cologne.heading),
        pitch: Cesium.Math.toRadians(config.cologne.pitch),
        roll: 0.0
    }
};

let viewer = null;
let currentBaseLayer = null;
let currentBaseMapId = null;
let currentImageryBaseMapId = null;
let currentBaseLayerDetachedForPhotorealistic = false;
let baseMapSwitchToken = 0;
let googlePhotorealisticTileset = null;
let googlePhotorealisticTilesetPromise = null;
let googlePhotorealisticSwitchToken = 0;
let deferredInitialPhotorealistic = false;
let googlePhotorealisticStartupAttempted = false;
let googlePhotorealisticRefinementTimerId = null;
let osmBuildingsTileset = null;
let osmBuildingsTilesetPromise = null;
let lod2TilesetWest = null;
let lod2TilesetEast = null;
let lod2TilesetWestPromise = null;
let lod2TilesetEastPromise = null;

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
    return baseMapCatalog[configuredBaseMapFallbackId]
        ? configuredBaseMapFallbackId
        : 'ion-aerial-labels';
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
    const requestedId = configuredBaseMapId === 'google-photorealistic'
        ? getFallbackBaseMapId()
        : configuredBaseMapId;
    const resolvedId = resolveBaseMapId(requestedId);
    const baseLayer = await createBaseLayerFromId(resolvedId);
    if (baseLayer) {
        currentBaseMapId = resolvedId;
        currentImageryBaseMapId = resolvedId;
        return baseLayer;
    }

    const fallbackProvider = await createImageryProvider();
    if (!fallbackProvider) {
        return null;
    }
    currentBaseMapId = getFallbackBaseMapId();
    currentImageryBaseMapId = currentBaseMapId;
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

function requestSceneRender() {
    if (viewer && viewer.scene && viewer.scene.requestRender) {
        viewer.scene.requestRender();
    }
}

function setCurrentImageryLayerVisible(visible) {
    if (currentBaseLayer) {
        currentBaseLayer.show = visible;
    }
    if (!viewer || !currentBaseLayer || !viewer.imageryLayers) {
        return;
    }

    const layerIsAttached = viewer.imageryLayers.contains(currentBaseLayer);
    if (!visible && layerIsAttached) {
        viewer.imageryLayers.remove(currentBaseLayer, false);
        currentBaseLayerDetachedForPhotorealistic = true;
        return;
    }
    if (visible && currentBaseLayerDetachedForPhotorealistic && !layerIsAttached) {
        viewer.imageryLayers.add(currentBaseLayer, 0);
        currentBaseLayerDetachedForPhotorealistic = false;
    }
}

function createGooglePhotorealisticTilesetOptions() {
    const foveatedRelaxation = Math.min(
        24.0,
        googlePhotorealisticInitialMaximumScreenSpaceError
    );

    return {
        cacheBytes: googlePhotorealisticCacheBytes,
        maximumCacheOverflowBytes: googlePhotorealisticCacheOverflowBytes,
        maximumScreenSpaceError: googlePhotorealisticInitialMaximumScreenSpaceError,
        enableCollision: googlePhotorealisticEnableCollision,
        cullRequestsWhileMoving: true,
        cullRequestsWhileMovingMultiplier: 100.0,
        preloadWhenHidden: false,
        preloadFlightDestinations: false,
        preferLeaves: false,
        dynamicScreenSpaceError: true,
        dynamicScreenSpaceErrorDensity: 2.5e-4,
        dynamicScreenSpaceErrorFactor: 32.0,
        dynamicScreenSpaceErrorHeightFalloff: 0.25,
        progressiveResolutionHeightFraction: 0.45,
        foveatedScreenSpaceError: true,
        foveatedConeSize: 0.15,
        foveatedMinimumScreenSpaceErrorRelaxation: foveatedRelaxation,
        foveatedTimeDelay: 0.6,
        skipLevelOfDetail: true,
        baseScreenSpaceError: 1024,
        skipScreenSpaceErrorFactor: 16,
        skipLevels: 1,
        immediatelyLoadDesiredLevelOfDetail: false,
        loadSiblings: false,
        showCreditsOnScreen: false
    };
}

async function createGooglePhotorealisticTileset() {
    const options = createGooglePhotorealisticTilesetOptions();

    if (!googlePhotorealisticIonAssetId) {
        throw new Error('Google Photorealistic 3D tileset is unavailable.');
    }

    if (Cesium.Cesium3DTileset && Cesium.Cesium3DTileset.fromIonAssetId) {
        return Cesium.Cesium3DTileset.fromIonAssetId(googlePhotorealisticIonAssetId, options);
    }

    if (Cesium.createGooglePhotorealistic3DTileset) {
        return Cesium.createGooglePhotorealistic3DTileset(undefined, options);
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

function setBaseMapNoteText(noteElement, message) {
    if (noteElement) {
        noteElement.textContent = message || '';
    }
}

function withTimeout(promise, timeoutMs, message) {
    if (!timeoutMs || timeoutMs <= 0) {
        return promise;
    }

    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
            reject(new Error(message));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise])
        .finally(() => {
            window.clearTimeout(timeoutId);
        });
}

function restoreFallbackGlobe() {
    if (googlePhotorealisticRefinementTimerId) {
        window.clearTimeout(googlePhotorealisticRefinementTimerId);
        googlePhotorealisticRefinementTimerId = null;
    }
    if (viewer && viewer.scene && viewer.scene.globe) {
        viewer.scene.globe.show = true;
    }
    setCurrentImageryLayerVisible(true);
    if (googlePhotorealisticTileset) {
        googlePhotorealisticTileset.show = false;
    }
}

function waitForGoogleInitialTiles(tileset, timeoutMs) {
    if (!tileset) {
        return Promise.resolve(false);
    }
    if (tileset.tilesLoaded) {
        return Promise.resolve(true);
    }

    return new Promise((resolve) => {
        let settled = false;
        let intervalId = null;
        let timeoutId = null;
        let removeInitialTilesListener = null;

        const finish = (ready) => {
            if (settled) {
                return;
            }
            settled = true;
            if (intervalId) {
                window.clearInterval(intervalId);
            }
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
            if (removeInitialTilesListener) {
                removeInitialTilesListener();
            }
            resolve(ready);
        };

        try {
            removeInitialTilesListener = tileset.initialTilesLoaded.addEventListener(() => {
                finish(true);
            });
        } catch (error) {
            console.warn('Google Photorealistic readiness listener failed.', error);
        }

        intervalId = window.setInterval(() => {
            if (tileset.tilesLoaded) {
                finish(true);
            }
        }, 250);

        timeoutId = window.setTimeout(() => {
            finish(false);
        }, timeoutMs || 15000);
    });
}

function scheduleGooglePhotorealisticRefinement(tileset, switchToken) {
    if (
        !tileset ||
        googlePhotorealisticRefinedMaximumScreenSpaceError >= googlePhotorealisticInitialMaximumScreenSpaceError
    ) {
        return;
    }

    if (googlePhotorealisticRefinementTimerId) {
        window.clearTimeout(googlePhotorealisticRefinementTimerId);
    }

    googlePhotorealisticRefinementTimerId = window.setTimeout(() => {
        googlePhotorealisticRefinementTimerId = null;
        if (
            switchToken !== googlePhotorealisticSwitchToken ||
            googlePhotorealisticTileset !== tileset ||
            !tileset.show
        ) {
            return;
        }

        tileset.maximumScreenSpaceError = googlePhotorealisticRefinedMaximumScreenSpaceError;
        requestSceneRender();
    }, 2500);
}

function clearGoogleLoadingNoteWhenReady(tileset, noteElement, switchToken) {
    if (!tileset) {
        return;
    }

    waitForGoogleInitialTiles(tileset, 15000).then((ready) => {
        if (switchToken === googlePhotorealisticSwitchToken) {
            if (noteElement) {
                setBaseMapNoteText(
                    noteElement,
                    ready ? '' : 'Google Photorealistic 3D is still streaming detail.'
                );
            }
            if (ready) {
                scheduleGooglePhotorealisticRefinement(tileset, switchToken);
            }
        }
    });
}

async function applyFallbackBaseMap(viewerInstance, noteElement, selectElement, message) {
    const fallbackId = getFallbackBaseMapId();
    restoreFallbackGlobe();
    ++googlePhotorealisticSwitchToken;

    if (selectElement && selectElement.value !== fallbackId) {
        selectElement.value = fallbackId;
    }

    if (fallbackId !== currentImageryBaseMapId || !currentBaseLayer) {
        await setBaseLayerById(viewerInstance, fallbackId, noteElement, selectElement, {
            skipPhotorealistic: true,
            noteMessage: message
        });
    } else {
        currentBaseMapId = fallbackId;
        setBaseMapNoteText(noteElement, message);
    }
}

async function setGooglePhotorealisticEnabled(enabled, options = {}) {
    if (!viewer) {
        return false;
    }

    const timeoutMs = Number.isFinite(Number(options.timeoutMs))
        ? Number(options.timeoutMs)
        : 0;
    const switchToken = ++googlePhotorealisticSwitchToken;
    if (!enabled) {
        restoreFallbackGlobe();
        return true;
    }

    setBaseMapNoteText(options.noteElement, options.loadingMessage || '');
    setCurrentImageryLayerVisible(false);
    if (viewer.scene) {
        if (viewer.scene.skyAtmosphere) {
            viewer.scene.skyAtmosphere.show = true;
        }
        if (viewer.scene.globe) {
            viewer.scene.globe.show = false;
        }
        requestSceneRender();
    }

    try {
        const tileset = await withTimeout(
            loadGooglePhotorealisticTileset(),
            timeoutMs,
            'Google Photorealistic did not become ready fast enough.'
        );

        if (switchToken !== googlePhotorealisticSwitchToken) {
            return false;
        }

        if (tileset) {
            tileset.show = true;
            if (viewer.scene) {
                if (viewer.scene.skyAtmosphere) {
                    viewer.scene.skyAtmosphere.show = true;
                }
                if (viewer.scene.globe) {
                    viewer.scene.globe.show = false;
                }
            }
            clearGoogleLoadingNoteWhenReady(tileset, options.noteElement, switchToken);
            return true;
        }
    } catch (error) {
        if (switchToken === googlePhotorealisticSwitchToken) {
            console.warn('Google Photorealistic fallback triggered.', error);
            restoreFallbackGlobe();
        }
        return false;
    }
    restoreFallbackGlobe();
    return false;
}

function deferInitialGooglePhotorealisticLoad() {
    if (!googlePhotorealisticAutoStart) {
        return;
    }
    deferredInitialPhotorealistic = true;
    if (viewer && viewer.scene && viewer.scene.globe) {
        viewer.scene.globe.show = true;
    }
}

function activateDeferredInitialPhotorealistic() {
    if (!deferredInitialPhotorealistic) {
        return;
    }
    deferredInitialPhotorealistic = false;

    const startLoad = async () => {
        if (
            googlePhotorealisticStartupAttempted ||
            configuredBaseMapId !== 'google-photorealistic'
        ) {
            return;
        }
        googlePhotorealisticStartupAttempted = true;

        const select = document.getElementById('baseMapSelect');
        const note = document.getElementById('baseMapNote');
        const ok = await setGooglePhotorealisticEnabled(true, {
            timeoutMs: googlePhotorealisticStartupTimeoutMs,
            noteElement: note,
            loadingMessage: 'Loading Google Photorealistic 3D...'
        });

        if (ok) {
            currentBaseMapId = 'google-photorealistic';
            if (select) {
                select.value = 'google-photorealistic';
            }
            setBaseMapNoteText(note, '');
            return;
        }

        await applyFallbackBaseMap(
            viewer,
            note,
            select,
            'Google Photorealistic is unavailable or too slow. Showing the fast 2D basemap.'
        );
    };

    if (window.requestIdleCallback) {
        window.requestIdleCallback(startLoad, { timeout: 2000 });
    } else {
        setTimeout(startLoad, 250);
    }
}

async function loadOsmBuildings() {
    if (osmBuildingsTileset) {
        return osmBuildingsTileset;
    }
    if (osmBuildingsTilesetPromise) {
        return osmBuildingsTilesetPromise;
    }

    osmBuildingsTilesetPromise = (async () => {
        if (Cesium.createOsmBuildingsAsync) {
            osmBuildingsTileset = await Cesium.createOsmBuildingsAsync();
        } else {
            osmBuildingsTileset = Cesium.createOsmBuildings();
        }

        if (osmBuildingsTileset) {
            osmBuildingsTileset.style = new Cesium.Cesium3DTileStyle({
                color: "color('gray')"
            });
            osmBuildingsTileset.show = false;
            viewer.scene.primitives.add(osmBuildingsTileset);
        }

        return osmBuildingsTileset;
    })()
        .catch((e) => {
            console.warn('Error loading OSM Buildings:', e);
            return null;
        })
        .finally(() => {
            osmBuildingsTilesetPromise = null;
        });

    return osmBuildingsTilesetPromise;
}

async function loadLod2Tileset(assetId, accessToken, label) {
    try {
        const resource = await Cesium.IonResource.fromAssetId(assetId, {
            accessToken: accessToken
        });
        const tileset = await Cesium.Cesium3DTileset.fromUrl(resource);

        if (tileset) {
            tileset.style = new Cesium.Cesium3DTileStyle({
                color: "color('gray')"
            });
            tileset.show = false;
            viewer.scene.primitives.add(tileset);
        }

        return tileset;
    } catch (e) {
        console.warn(`Error loading ${label} Buildings:`, e);
        return null;
    }
}

function setLod2TilesetsVisible(visible) {
    if (lod2TilesetWest) {
        lod2TilesetWest.show = visible;
    }
    if (lod2TilesetEast) {
        lod2TilesetEast.show = visible;
    }
}

async function loadLod2Tilesets() {
    const [west, east] = await Promise.all([
        Lod2TilesetWest(),
        Lod2TilesetEast()
    ]);
    return { west, east };
}

async function setOsmBuildingsVisible(visible) {
    if (!visible) {
        if (osmBuildingsTileset) {
            osmBuildingsTileset.show = false;
        }
        return;
    }

    const tileset = await loadOsmBuildings();
    if (tileset) {
        tileset.show = lodCheckbox ? lodCheckbox.checked : true;
    }
}

async function setLod2BuildingsVisible(visible) {
    if (!visible) {
        setLod2TilesetsVisible(false);
        return;
    }

    await loadLod2Tilesets();
    setLod2TilesetsVisible(lodCheckboxGeobasis ? lodCheckboxGeobasis.checked : true);
}

async function Lod2TilesetWest() {
    if (lod2TilesetWest) {
        return lod2TilesetWest;
    }
    if (lod2TilesetWestPromise) {
        return lod2TilesetWestPromise;
    }

    lod2TilesetWestPromise = loadLod2Tileset(
        config.lod2WestIonAssetId,
        config.lod2WestIonToken,
        'Lod2 West'
    )
        .then((tileset) => {
            lod2TilesetWest = tileset;
            return tileset;
        })
        .finally(() => {
            lod2TilesetWestPromise = null;
        });

    return lod2TilesetWestPromise;
}

async function Lod2TilesetEast() {
    if (lod2TilesetEast) {
        return lod2TilesetEast;
    }
    if (lod2TilesetEastPromise) {
        return lod2TilesetEastPromise;
    }

    lod2TilesetEastPromise = loadLod2Tileset(
        config.lod2EastIonAssetId,
        config.lod2EastIonToken,
        'Lod2 East'
    )
        .then((tileset) => {
            lod2TilesetEast = tileset;
            return tileset;
        })
        .finally(() => {
            lod2TilesetEastPromise = null;
        });

    return lod2TilesetEastPromise;
}

function updateBaseMapNote(noteElement, baseMapId) {
    if (!noteElement) {
        return;
    }
    if (!hasMapboxToken() && baseMapId === 'mapbox-streets') {
        noteElement.textContent = 'Mapbox requires an access token in config.js.';
        return;
    }

    noteElement.textContent = '';
}

async function setBaseLayerById(viewerInstance, baseMapId, noteElement, selectElement, options = {}) {
    if (!viewerInstance) {
        return;
    }

    const resolvedId = resolveBaseMapId(baseMapId);
    if (selectElement && selectElement.value !== resolvedId) {
        selectElement.value = resolvedId;
    }

    if (options.noteMessage) {
        setBaseMapNoteText(noteElement, options.noteMessage);
    } else {
        updateBaseMapNote(noteElement, baseMapId);
    }

    const enablePhotorealistic = resolvedId === 'google-photorealistic';
    deferredInitialPhotorealistic = false;
    if (!options.skipPhotorealistic) {
        if (enablePhotorealistic) {
            const ok = await setGooglePhotorealisticEnabled(true, {
                noteElement: noteElement,
                loadingMessage: 'Loading Google Photorealistic 3D...'
            });
            if (!ok) {
                await applyFallbackBaseMap(
                    viewerInstance,
                    noteElement,
                    selectElement,
                    'Google Photorealistic is unavailable or too slow. Showing the fast 2D basemap.'
                );
                return;
            }
            currentBaseMapId = resolvedId;
            requestSceneRender();
            return;
        } else {
            await setGooglePhotorealisticEnabled(false);
        }
    }

    if (resolvedId === currentImageryBaseMapId && currentBaseLayer) {
        currentBaseMapId = resolvedId;
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
        currentImageryBaseMapId = resolvedId;
        currentBaseMapId = resolvedId;
        setupImageryFallbackForLayer(viewerInstance, layer);
    } catch (error) {
        console.warn(`Base map switch failed (${resolvedId}).`, error);
        if (resolvedId === 'google-photorealistic') {
            await applyFallbackBaseMap(
                viewerInstance,
                noteElement,
                selectElement,
                'Google Photorealistic could not be loaded. Showing the fast 2D basemap.'
            );
        }
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
    if (
        configuredBaseMapId === 'google-photorealistic' &&
        googlePhotorealisticAutoStart &&
        deferGooglePhotorealisticUntilInteractive &&
        !eagerLoadOptionalTilesets
    ) {
        deferInitialGooglePhotorealisticLoad();
    } else {
        void setGooglePhotorealisticEnabled(currentBaseMapId === 'google-photorealistic', {
            noteElement: baseMapNote,
            loadingMessage: 'Loading Google Photorealistic 3D...'
        });
    }

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
    if (visible) {
        void loadHeritageTilesets().then(() => {
            if (tilesetsVisible) {
                loadedTilesets.forEach((tileset) => {
                    tileset.show = true;
                });
            }
        });
        return;
    }

    loadedTilesets.forEach((tileset) => {
        tileset.show = false;
    });
}

function loadHeritageTilesets() {
    if (!enable3DTiles) {
        return Promise.resolve([]);
    }
    if (heritageTilesetsReady) {
        return heritageTilesetsReady;
    }

    heritageTilesetsReady = Promise.resolve(assetsReady)
        .then(() => Promise.all(
            assets
                .filter(asset => asset && asset.id && asset.denkmallistennummer)
                .map(asset => addIonTileset(asset.id, asset.denkmallistennummer))
        ))
        .then(results => results.filter(tileset => tileset))
        .catch((error) => {
            console.warn('Heritage 3D tilesets failed to load.', error);
            return [];
        });

    return heritageTilesetsReady;
}

// Reduce marker/label clutter and group nearby points.
const markerWidth = 38;
const markerHeight = 38;
const selectedMarkerWidth = 46;
const selectedMarkerHeight = 46;
const markerPixelOffset = new Cesium.Cartesian2(0, 0);
const markerDepthTestDistance = Number.POSITIVE_INFINITY;
const markerScaleByDistance = new Cesium.NearFarScalar(1500.0, 1.08, 15000.0, 0.5);
const selectedMarkerScaleByDistance = new Cesium.NearFarScalar(1500.0, 1.2, 15000.0, 0.62);
const labelMaxDistance = 3200.0;
const selectedLabelMaxDistance = 6500.0;
const labelDistanceDisplayCondition = new Cesium.DistanceDisplayCondition(0.0, labelMaxDistance);
const selectedLabelDistanceDisplayCondition = new Cesium.DistanceDisplayCondition(0.0, selectedLabelMaxDistance);
const labelScaleByDistance = new Cesium.NearFarScalar(300.0, 1.0, labelMaxDistance, 0.35);
const selectedLabelScaleByDistance = new Cesium.NearFarScalar(300.0, 1.08, selectedLabelMaxDistance, 0.5);
const labelTranslucencyByDistance = new Cesium.NearFarScalar(300.0, 1.0, labelMaxDistance, 0.0);
const selectedLabelTranslucencyByDistance = new Cesium.NearFarScalar(300.0, 1.0, selectedLabelMaxDistance, 0.0);
const labelPixelOffset = new Cesium.Cartesian2(0, -46);
const selectedLabelPixelOffset = new Cesium.Cartesian2(0, -54);
const labelBackgroundColor = Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.82);
const selectedLabelBackgroundColor = Cesium.Color.fromAlpha(Cesium.Color.fromCssColorString('#062f35'), 0.94);
const labelFillColor = Cesium.Color.WHITE;
const selectedLabelFillColor = Cesium.Color.fromCssColorString('#eaffff');
const markerFocusOffset = new Cesium.HeadingPitchRange(
    0.0,
    Cesium.Math.toRadians(config.defaultCameraOffset.pitch),
    650.0
);
const clusterPixelRange = 40;
const clusterMinimumSize = 3;
const clusterZoomMinRange = 140.0;
const clusterZoomSmallRange = 220.0;
const clusterZoomMaxRange = 1200.0;
const clusterZoomPitch = Cesium.Math.toRadians(-58.0);
const clusterPinBuilder = new Cesium.PinBuilder();
const clusterPinCache = new Map();

let monumentsDataSource = null;
const loadedTilesets = [];
let heritageTilesetsReady = null;
let tilesetsVisible = false;
let selectedMarkerEntity = null;

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

// Setup independent LOD Data toggle (Checkbox) OpenStreetMap Buildings
const lodCheckbox = document.getElementById('lodData');
if (lodCheckbox) {
    lodCheckbox.addEventListener('change', (e) => {
        void setOsmBuildingsVisible(e.target.checked);

        const label = lodCheckbox.closest('label');
        if (label) {
            if (e.target.checked) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        }
    });
    if (lodCheckbox.checked) {
        void setOsmBuildingsVisible(true);
    }
}

// Setup independent LOD2 Data toggle (Checkbox)
const lodCheckboxGeobasis = document.getElementById('lodDataGeobasis');
if (lodCheckboxGeobasis) {
    lodCheckboxGeobasis.addEventListener('change', (e) => {
        void setLod2BuildingsVisible(e.target.checked);

        const label = lodCheckboxGeobasis.closest('label');
        if (label) {
            if (e.target.checked) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        }
    });
    if (lodCheckboxGeobasis.checked) {
        void setLod2BuildingsVisible(true);
    }
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

function isMarkerEntity(entity) {
    return Cesium.defined(entity) && Cesium.defined(entity.position) && Cesium.defined(entity.billboard) && Cesium.defined(entity.label);
}

function setMarkerSelected(entity, selected) {
    if (!isMarkerEntity(entity)) {
        return;
    }

    entity.billboard.width = selected ? selectedMarkerWidth : markerWidth;
    entity.billboard.height = selected ? selectedMarkerHeight : markerHeight;
    entity.billboard.scaleByDistance = selected ? selectedMarkerScaleByDistance : markerScaleByDistance;
    entity.billboard.disableDepthTestDistance = markerDepthTestDistance;

    entity.label.fillColor = selected ? selectedLabelFillColor : labelFillColor;
    entity.label.outlineWidth = selected ? 4 : 3;
    entity.label.pixelOffset = selected ? selectedLabelPixelOffset : labelPixelOffset;
    entity.label.backgroundColor = selected ? selectedLabelBackgroundColor : labelBackgroundColor;
    entity.label.distanceDisplayCondition = selected ? selectedLabelDistanceDisplayCondition : labelDistanceDisplayCondition;
    entity.label.scaleByDistance = selected ? selectedLabelScaleByDistance : labelScaleByDistance;
    entity.label.translucencyByDistance = selected ? selectedLabelTranslucencyByDistance : labelTranslucencyByDistance;
    entity.label.disableDepthTestDistance = markerDepthTestDistance;
}

function clearSelectedMarker() {
    if (selectedMarkerEntity) {
        setMarkerSelected(selectedMarkerEntity, false);
        selectedMarkerEntity = null;
    }
}

function selectMarkerEntity(entity) {
    if (!isMarkerEntity(entity)) {
        clearSelectedMarker();
        return;
    }

    if (selectedMarkerEntity && selectedMarkerEntity !== entity) {
        setMarkerSelected(selectedMarkerEntity, false);
    }

    selectedMarkerEntity = entity;
    setMarkerSelected(entity, true);
}

function focusEntityMarker(entity, duration) {
    if (!viewer || !isMarkerEntity(entity)) {
        return;
    }

    selectMarkerEntity(entity);
    viewer.selectedEntity = entity;
    viewer.flyTo(entity, {
        duration: duration || 1.8,
        offset: markerFocusOffset
    });
}

/**
 * Function to update the visibility of entities based on the selected radio button.
 * @param {string} radioId - The id of the selected radio button.
 */
function updateEntities(radioId) {
    const showTilesets = radioId === 'viewer3d' || (showTilesetsWithAllMarkers && radioId === 'allMarkers');
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

    if (selectedMarkerEntity && !selectedMarkerEntity.show) {
        clearSelectedMarker();
    }

    invalidateMarkerClusters();
    requestSceneRender();
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
        cluster.billboard.disableDepthTestDistance = markerDepthTestDistance;
        const clusterId = {
            heritageCluster: true,
            entities: clusteredEntities
        };
        cluster.billboard.id = clusterId;
        cluster.label.id = clusterId;
    });
}

function invalidateMarkerClusters() {
    if (!monumentsDataSource || !monumentsDataSource.clustering) {
        return;
    }

    const clustering = monumentsDataSource.clustering;
    const pixelRange = clustering.pixelRange;
    clustering.pixelRange = pixelRange + 1;
    clustering.pixelRange = pixelRange;
}

function isValidCartesianPosition(position) {
    return Cesium.defined(position)
        && Number.isFinite(position.x)
        && Number.isFinite(position.y)
        && Number.isFinite(position.z);
}

function getVisibleClusterMarkerPositions(clusteredEntities, now) {
    return clusteredEntities
        .filter(entity => entity && entity.show !== false && isMarkerEntity(entity))
        .map(entity => entity.position.getValue(now))
        .filter(isValidCartesianPosition);
}

function getClusterZoomRange(boundingSphere, markerCount) {
    const radius = Math.max(boundingSphere.radius || 0, 1.0);
    const count = Math.max(markerCount, clusterMinimumSize);

    if (count <= 4) {
        return Math.min(
            clusterZoomSmallRange,
            Math.max(clusterZoomMinRange, radius * 8.0)
        );
    }

    const countFactor = Math.min(count, 14);
    const scaledRange = radius * (7.0 + countFactor);

    return Math.min(
        clusterZoomMaxRange,
        Math.max(clusterZoomSmallRange, scaledRange)
    );
}

function zoomToClusterEntities(clusteredEntities) {
    if (!clusteredEntities || clusteredEntities.length === 0) {
        return;
    }

    const now = Cesium.JulianDate.now();
    const positions = getVisibleClusterMarkerPositions(clusteredEntities, now);

    if (positions.length === 0) {
        return;
    }

    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    const range = getClusterZoomRange(boundingSphere, positions.length);
    const offset = new Cesium.HeadingPitchRange(
        viewer.camera.heading,
        clusterZoomPitch,
        range
    );

    viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 1.0,
        offset: offset,
        complete: () => {
            invalidateMarkerClusters();
            requestSceneRender();
        }
    });
    invalidateMarkerClusters();
    requestSceneRender();
}

function fetchJson(url, timeoutMs) {
    const controller = timeoutMs > 0 && window.AbortController
        ? new AbortController()
        : null;
    let timeoutId = null;

    if (controller) {
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    return fetch(url, controller ? { signal: controller.signal } : undefined)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network error: ' + response.statusText);
            }
            return response.json();
        })
        .finally(() => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        });
}

let monumentsGeoJsonReady = null;

function fetchMonumentsSource(source) {
    const isRemote = /^https?:\/\//i.test(source);
    return fetchJson(source, isRemote ? remoteMonumentFetchTimeoutMs : 0);
}

function raceRemoteMonumentsWithLocalFallback(remoteSource, localSource) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let failureCount = 0;
        let lastError = null;
        let localFallbackStarted = false;
        let localFallbackTimerId = null;

        const finish = (data) => {
            if (settled) {
                return;
            }
            settled = true;
            if (localFallbackTimerId) {
                window.clearTimeout(localFallbackTimerId);
            }
            resolve(data);
        };

        const fail = (source, error) => {
            failureCount += 1;
            lastError = error;
            if (failureCount >= 2 && !settled) {
                console.warn(`GeoJSON load failed (${source}).`, error);
                reject(lastError || new Error('No GeoJSON sources available.'));
            }
        };

        const startLocalFallback = () => {
            if (localFallbackStarted) {
                return;
            }
            localFallbackStarted = true;
            localFallbackTimerId = null;
            fetchMonumentsSource(localSource)
                .then(finish)
                .catch((error) => fail(localSource, error));
        };

        localFallbackTimerId = window.setTimeout(
            startLocalFallback,
            Math.min(900, Math.max(0, remoteMonumentFetchTimeoutMs))
        );

        fetchMonumentsSource(remoteSource)
            .then(finish)
            .catch((error) => {
                console.warn(`GeoJSON remote source failed (${remoteSource}); using local fallback.`, error);
                if (localFallbackTimerId) {
                    window.clearTimeout(localFallbackTimerId);
                    localFallbackTimerId = null;
                }
                startLocalFallback();
            });
    });
}

async function loadMonumentsGeoJson() {
    if (monumentsGeoJsonReady) {
        return monumentsGeoJsonReady;
    }

    const remoteSource = monumentsRemoteUrl && /^https?:\/\//i.test(monumentsRemoteUrl)
        ? monumentsRemoteUrl
        : null;
    const localSource = monumentsLocalUrl || null;

    if (remoteSource && localSource) {
        monumentsGeoJsonReady = raceRemoteMonumentsWithLocalFallback(remoteSource, localSource);
        return monumentsGeoJsonReady;
    }

    const sources = [monumentsRemoteUrl, monumentsLocalUrl];
    monumentsGeoJsonReady = (async () => {
        let lastError = null;

        for (const source of sources) {
            if (!source) {
                continue;
            }

            try {
                return await fetchMonumentsSource(source);
            } catch (error) {
                console.warn(`GeoJSON load failed (${source}).`, error);
                lastError = error;
            }
        }

        throw lastError || new Error('No GeoJSON sources available.');
    })();

    return monumentsGeoJsonReady;
}

async function loadGeoJsonDataSource() {
    const geoJson = await loadMonumentsGeoJson();
    return Cesium.GeoJsonDataSource.load(geoJson);
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
                    width: markerWidth,
                    height: markerHeight,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: markerPixelOffset,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    scaleByDistance: markerScaleByDistance,
                    disableDepthTestDistance: markerDepthTestDistance
                });

                // Define the marker label
                entity.label = new Cesium.LabelGraphics({
                    text: name,
                    font: '600 14px "Segoe UI", Arial, sans-serif',
                    fillColor: labelFillColor,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 3,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: labelPixelOffset,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    showBackground: true,
                    backgroundColor: labelBackgroundColor,
                    backgroundPadding: new Cesium.Cartesian2(8, 6),
                    distanceDisplayCondition: labelDistanceDisplayCondition,
                    scaleByDistance: labelScaleByDistance,
                    translucencyByDistance: labelTranslucencyByDistance,
                    disableDepthTestDistance: markerDepthTestDistance
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
                        focusEntityMarker(entity, 1.8);
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
 * Loads 3D asset metadata used for marker filtering and on-demand
 * heritage tileset loading.
 */
const assetsUrl = config.assetsUrl;

let assets = [];
const assetsByMonument = new Map();
let assetsReady = null;

function loadAssets() {
    if (!enable3DTiles) {
        return Promise.resolve();
    }

    return fetchJson(assetsUrl)
        .then(data => {
            assets = Array.isArray(data.assets) ? data.assets : [];
            assetsByMonument.clear();
            assets.forEach(asset => {
                if (asset && asset.denkmallistennummer) {
                    assetsByMonument.set(String(asset.denkmallistennummer), asset);
                }
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
        navigationHelpButton: false,
        animation: showCesiumTimeControls,
        timeline: showCesiumTimeControls
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
    if (eagerLoadOptionalTilesets) {
        void loadOsmBuildings();
        void loadLod2Tilesets();
        void loadHeritageTilesets();
    }


    const loadingScreen = document.getElementById('loadingScreen');

    function hideLoading() {
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            loadingScreen.style.display = 'none';
        }
    }

    void loadGeoJson()
        .finally(() => {
            hideLoading();
            activateDeferredInitialPhotorealistic();
        });

    const latNum = parseFloat(getUrlParameter('lat'));
    const lonNum = parseFloat(getUrlParameter('lon'));

    if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lonNum, latNum - 0.001, 200),
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
            clearSelectedMarker();
            return;
        }

        const pickedId = pickedObject.id || (pickedObject.primitive && pickedObject.primitive.id);
        if (pickedId && pickedId.heritageCluster) {
            zoomToClusterEntities(pickedId.entities);
            return;
        }

        if (Cesium.defined(pickedId)) {
            selectMarkerEntity(pickedId);
            showEntityInfo(pickedId);
            // Use central panel management to ensure exclusivity
            openPanel('info');
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Move the camera to the marker on double-click
    viewer.screenSpaceEventHandler.setInputAction(function onDoubleClick(movement) {
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
            focusEntityMarker(pickedId, 1.8);
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
            // Build via DOM nodes (not innerHTML): monument data may come from the
            // remote source and must not be treated as trusted markup.
            const labelEl = document.createElement('strong');
            labelEl.textContent = `${property}:`;
            div.appendChild(labelEl);
            div.appendChild(document.createTextNode(` ${value}`));
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
            button.className = control.prop === 'model3d'
                ? 'info-action-button info-action-button-3d'
                : 'info-action-button';

            // Default behavior for links
            button.onclick = () => {
                const url = sanitizeHttpUrl(entity.properties[control.urlProp].getValue());
                if (!url) return;
                window.open(url, '_blank', 'noopener,noreferrer');
            };

            infoBox.appendChild(button);
        }
    });

    // Automatically display photo if available
    if (entity.properties.fotourl) {
        const url = sanitizeHttpUrl(entity.properties.fotourl.getValue());
        if (url) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'entity-image-container';
            imgContainer.style.marginTop = '15px';
            imgContainer.style.textAlign = 'center';
            // Build the image via DOM (not innerHTML): the photo URL is untrusted
            // monument data and must not be interpolated into markup/handlers.
            const img = document.createElement('img');
            img.src = url;
            img.alt = 'Denkmal Foto';
            img.title = 'Click to enlarge';
            img.style.cssText = 'max-width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer;';
            img.addEventListener('click', () => {
                window.open(url, '_blank', 'noopener,noreferrer');
            });
            imgContainer.appendChild(img);
            infoBox.appendChild(imgContainer);
        }
    }
}

/**
 * Returns the URL only if it is a safe absolute http(s) URL, otherwise null.
 * Guards against javascript:/data: and other injection vectors in untrusted data.
 * @param {*} value - Candidate URL from monument data.
 * @returns {string|null}
 */
function sanitizeHttpUrl(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    try {
        const parsed = new URL(trimmed, window.location.href);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch (error) {
        return null;
    }
    return null;
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
        panelEl.style.display = panelKey === 'aichat' ? 'flex' : 'block';
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
