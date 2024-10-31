// Cesium Ion access token
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMjhiN2RhOC1lYThlLTQ3NGEtYWQ3NC05YjRmOTI5M2M0OWEiLCJpZCI6NzgzODEsImlhdCI6MTcxMDc5ODQ0MH0.nuQD0pwTIy_aHKIqEGLzrhxCCCelkCHyNeJURm3v-Q8";

// Create the Cesium Viewer
const viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: Cesium.createWorldTerrain(),
    imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
    }),
    baseLayerPicker: true, // Disable BaseLayerPicker
    sceneModePicker: false // Disable scene mode picker
});

// Enable 3D lighting
viewer.scene.globe.enableLighting = true;

// Define radio buttons for different entity types
const radios = {
    model3d: document.getElementById('3dmodel'),
    photo: document.getElementById('photo'),
    wikipedia: document.getElementById('wikipedia'),
    openstreetmap: document.getElementById('openstreetmap'),
    allMarkers: document.getElementById('allMarkers')
};

// Add event listeners to radio buttons
for (const radioId in radios) {
    radios[radioId].addEventListener('change', () => {
        updateEntities(radioId);
    });
}

/**
 * Function to update the visibility of entities based on the selected radio button.
 * @param {string} radioId - The id of the selected radio button.
 */
function updateEntities(radioId) {
    const entities = viewer.dataSources.get(0).entities.values;

    entities.forEach(entity => {
        let isVisible = false;

        switch (radioId) {
            case 'model3d':
                isVisible = entity.properties.model3d && entity.properties.model3d.getValue() === 'ja';
                break;
            case 'photo':
                isVisible = entity.properties.foto && entity.properties.foto.getValue() === 'ja';
                break;
            case 'wikipedia':
                isVisible = entity.properties.wiki && entity.properties.wiki.getValue() === 'ja';
                break;
            case 'openstreetmap':
                isVisible = entity.properties.osm && entity.properties.osm.getValue() === 'ja';
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

// Set new home location for the Home button
const newHomeLocation = new Cesium.Cartesian3(4049031.6615590854, 494694.75900322065, 4935825.152304239);

// Add click event for the Home button
viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function () {
    viewer.camera.flyTo({
        destination: newHomeLocation,
        orientation: {
            heading: Cesium.Math.toRadians(6.283185307179586),
            pitch: Cesium.Math.toRadians(-1.5685397851648877),
            roll: 0
        },
        duration: 3 // Animation duration
    });
});

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

// Get latitude and longitude parameters
var lat = getUrlParameter('lat');
var lon = getUrlParameter('lon');

/**
 * Function to load GeoJSON data and add it to the viewer.
 */
async function loadGeoJson() {
    try {
        const dataSource = await Cesium.GeoJsonDataSource.load('Data/denkmaeler.json');
        await viewer.dataSources.add(dataSource);

        const entities = dataSource.entities.values;

        // Iterate over entities and set their properties
        entities.forEach(entity => {
            if (entity.position) {
                const name = entity.properties.kurzbezeichnung ? entity.properties.kurzbezeichnung.getValue() : '';

                // Set billboard graphics
                entity.billboard = new Cesium.BillboardGraphics({
                    image: 'Images/marker.png',
                    width: 32,
                    height: 32,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                });

                // Set label graphics
                entity.label = new Cesium.LabelGraphics({
                    text: name,
                    font: '11pt sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -32),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                });

                // Adjust label position based on zoom level
                viewer.scene.preRender.addEventListener(function () {
                    var zoomThreshold = 5000;
                    var currentZoom = viewer.camera.zoomFactor;
                    entity.billboard.pixelOffset = currentZoom < zoomThreshold 
                        ? new Cesium.Cartesian2(0, -32) 
                        : new Cesium.Cartesian2(0, -16);
                });
            }
        });
        
        // zoom to lat lon parameters
        // example: ?lon=6.947531&lat=50.926031  --> Diana mit springender Antilope
        if (lat && lon) {
            viewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(parseFloat(lon), parseFloat(lat - 0.001), 200),
                orientation: {
                    heading: Cesium.Math.toRadians(0.0),
                    pitch: Cesium.Math.toRadians(-45.0),
                    roll: 0
                }
            });
        } else {
            viewer.flyTo(dataSource); // Otherwise, fly to the data source
        }
    } catch (error) {
        console.error(error);
    }
}

// Load GeoJSON data
loadGeoJson();

// Define the asset IDs for 3D Tileset
const assetIds = [96188, 2255119 /* Add other asset IDs here */];

// Add 3D Tilesets to the viewer
assetIds.forEach((id) => {
    viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
        url: Cesium.IonResource.fromAssetId(id),
    }));
});

// Add event listener for click events on the map
viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
    const pickedObject = viewer.scene.pick(movement.position);
    if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
        const entity = pickedObject.id;
        showEntityInfo(entity); // Show information for the clicked entity
        document.getElementById('infoBox').style.display = 'block';
        document.getElementById('openInfoBox').style.display = 'none';
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

/**
 * Function to show information for a clicked entity.
 * @param {Cesium.Entity} entity - The clicked entity.
 */
function showEntityInfo(entity) {
    const infoBox = document.getElementById('infoContent');
    
    // Clear existing content
    infoBox.innerHTML = '';

    // Display entity properties
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

    // Create buttons for related links
    const controls = [
        { prop: 'wiki', urlProp: 'wikiurl', label: 'Wikipedia' },
        { prop: 'model3d', urlProp: 'model3durl', label: '3D Model' },
        { prop: 'foto', urlProp: 'fotourl', label: 'Foto' },
        { prop: 'osm', urlProp: 'osmurl', label: 'OpenStreetMap' }
    ];

    controls.forEach(control => {
        if (entity.properties[control.prop] && entity.properties[control.prop].getValue() === 'ja') {
            const button = document.createElement('button');
            button.innerHTML = control.label;
            button.onclick = () => {
                window.open(entity.properties[control.urlProp].getValue(), '_blank');
            };
            infoBox.appendChild(button);
        }
    });
}




    // Move the camera to the marker on double-click
    viewer.screenSpaceEventHandler.setInputAction(function onDoubleClick(movement) {
        const pickedObject = viewer.scene.pick(movement.position);
        if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
            const entity = pickedObject.id;
            const markerPosition = entity.position.getValue(Cesium.JulianDate.now());

            // Height offset to position the camera above the marker
            const heightOffset = 200; // Marker'ın üstünde olmak için

            // Position the camera behind the marker
            const cameraPosition = new Cesium.Cartesian3(
                markerPosition.x + 400, // Move in the X direction
                markerPosition.y + 50,  // Move in the Y direction
                markerPosition.z + heightOffset // Move up
            );

            viewer.camera.flyTo({
                destination: cameraPosition,
                orientation: {
                    heading: Cesium.Math.toRadians(0.0), // Camera direction
                    pitch: Cesium.Math.toRadians(-60.0), // Downward viewing angle
                    roll: 0.0
                },
                duration: 3 // Animation duration
            });
        }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);





// Add event listener for close button in the info box
document.getElementById('closeInfoBox').onclick = () => {
    document.getElementById('infoBox').style.display = 'none';
    document.getElementById('openInfoBox').style.display = 'block';
};

// Add event listener for the open info box button
document.getElementById('openInfoBox').onclick = () => {
    document.getElementById('infoBox').style.display = 'block';
    document.getElementById('openInfoBox').style.display = 'none';
};

// Add event listener for close button in the options box
document.getElementById('closeOptionsBox').onclick = () => {
    document.getElementById('optionsBox').style.display = 'none';
    document.getElementById('openOptionsBox').style.display = 'block';
};

// Add event listener for the open options box button
document.getElementById('openOptionsBox').onclick = () => {
    document.getElementById('optionsBox').style.display = 'block';
    document.getElementById('openOptionsBox').style.display = 'none';
};
