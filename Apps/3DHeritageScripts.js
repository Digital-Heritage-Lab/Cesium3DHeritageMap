// Cesium Ion access token
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMjhiN2RhOC1lYThlLTQ3NGEtYWQ3NC05YjRmOTI5M2M0OWEiLCJpZCI6NzgzODEsImlhdCI6MTcxMDc5ODQ0MH0.nuQD0pwTIy_aHKIqEGLzrhxCCCelkCHyNeJURm3v-Q8";

// Köln lon & lat
const cologneLocation = Cesium.Cartesian3.fromDegrees(6.9603, 50.7375, 25000);

// Create the Cesium Viewer
const viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: Cesium.createWorldTerrain(),
    imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
    }),
    baseLayerPicker: false, // Disable BaseLayerPicker
    sceneModePicker: false, // Disable scene mode picker
    navigationHelpButton: false // Disable navigation help button
});

viewer.camera.setView({
    destination: cologneLocation,
    orientation: {
        heading: Cesium.Math.toRadians(0.0), // The direction of the camera
        pitch: Cesium.Math.toRadians(-45.0),
        roll: 0.0
    }
});

// Enable 3D lighting
viewer.scene.globe.enableLighting = true;

// Define radio buttons for different entity types
const radios = {
    viewer3d: document.getElementById('viewer3d'),
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
            case 'viewer3d':
                isVisible = entity.properties.viewer3d && entity.properties.viewer3d.getValue() === 'ja';
                break;
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

/**
 * Function to load GeoJSON data and add it to the viewer. *
 */
let markersInitialized = false; // Markers will only be loaded once

async function loadGeoJson() {
    try {
        if (markersInitialized) return; // If markers are already loaded, do not load again

        let dataSource = await Cesium.GeoJsonDataSource.load('https://opendem.info/cgi-bin/getDenkmal.py');

        await viewer.dataSources.add(dataSource);

        const entities = dataSource.entities.values;

        // Story Map Box element
        const storyMapBox = document.getElementById('storyMapBox');
        storyMapBox.innerHTML = '<h2>Story Mapping</h2>'; // Reset the content

        entities.forEach(entity => {
            if (entity.position) {
                const name = entity.properties.kurzbezeichnung ? entity.properties.kurzbezeichnung.getValue() : '';

                // Define the marker
                entity.billboard = new Cesium.BillboardGraphics({
                    image: 'Images/marker.png',
                    width: 32,
                    height: 32,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                });

                // Define the marker label
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

                // If the viewer3d property is "ja", append its kurzbezeichnung to the story map box
                if (entity.properties.viewer3d && entity.properties.viewer3d.getValue() === 'ja') {

                    assets.forEach(asset => {

                        if (asset.denkmallistennummer == entity.properties.denkmallistennummer.getValue()) {

                            if (asset.xcoord) {
                                entity.position._value.x = asset.xcoord;
                            }
                            if (asset.ycoord) {
                                entity.position._value.y = asset.ycoord;
                            }
                            if (asset.zcoord) {
                                entity.position._value.z = asset.zcoord;
                            }


                        }
                    });



                    const kurzbezeichnung = entity.properties.kurzbezeichnung ? entity.properties.kurzbezeichnung.getValue() : 'No name available';
                    const pElement = document.createElement('p');
                    pElement.textContent = kurzbezeichnung;

                    // Add click event to each name that moves the camera to the entity's position
                    pElement.addEventListener('click', () => {
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
                    });

                    storyMapBox.appendChild(pElement); // Add to Story Map Box
                }
            }
        });

        // Mark that markers are loaded
        markersInitialized = true;

        // Apply the selected filter initially
        const selectedRadio = Object.keys(radios).find(key => radios[key].checked);
        updateEntities(selectedRadio);

    } catch (error) {
        console.error(error);
    }
}



// Load GeoJSON data
// Wait till scene is ready using scene.globe.tileLoadProgressEvent
viewer.scene.globe.tileLoadProgressEvent.addEventListener((count) => {
    if (count === 0) {
        console.log("Globe is fully loaded");
        loadGeoJson();
    }
});


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

// Get latitude and longitude parameters
var lat = getUrlParameter('lat');
var lon = getUrlParameter('lon');

// zoom to lat lon parameters
// example: ?lon=6.947531&lat=50.926031  --> Diana mit springender Antilope
if (lat && lon) {
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(parseFloat(lon), parseFloat(lat - 0.001), 200),
        orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-45.0),
            roll: 0
        },
        duration: 3 // animation duration
    });

}



/**
 * Loads 3D asset data from 'assets.json' and monument data from
 * 'denkmaeler.json'. It adds a default 3D Tileset using a fixed
 * asset ID and appends corresponding assets to the Cesium viewer
 * based on matching monument numbers. You can add more assets to
 * assets.json and they will be displayed on the map if they match
 * a monument number in denkmaeler.json.
 */
const assetsUrl = 'Data/assets.json'; // First file
//const denkmaelerUrl = 'Data/denkmaeler.json'; // Second file
const denkmaelerUrl = 'https://opendem.info/cgi-bin/getDenkmal.py';

let assets = {};

// Load the first JSON file
fetch(assetsUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network error: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {


        assets = data.assets; // Assets are defined here

        // Load the second JSON file
        return fetch(denkmaelerUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network error: ' + response.statusText);
                }
                return response.json();
            })
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

                // Add tileset with fixed ID
                const defaultTileset = new Cesium.Cesium3DTileset({
                    url: Cesium.IonResource.fromAssetId(96188),
                });
                viewer.scene.primitives.add(defaultTileset);

                // Check elements from the assets array and add them if there is a match
                assets.forEach(asset => {
                    const denkmallistennummer = asset.denkmallistennummer;

                    // If denkmallistennummer exists and there is a match, add it
                    if (denkmallistennummer && denkmaelerMap[denkmallistennummer]) {

                        // todo get
                        const assetUrl = Cesium.IonResource.fromAssetId(asset.id); // Use asset ID
                        const tileset = new Cesium.Cesium3DTileset({
                            url: assetUrl,
                        });
                        viewer.scene.primitives.add(tileset);
                    }
                });
            });
    })
    .catch(error => {
        console.error('Error:', error);
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
        let markerPosition = entity.position.getValue(Cesium.JulianDate.now());



        let x = 400;
        // Height offset to position the camera above the marker
        let heightOffset = 200; // Marker'ın üstünde olmak için

        assets.forEach(asset => {

            if (pickedObject.id.properties.denkmallistennummer.getValue() === asset.denkmallistennummer) {
                if (asset.x) {
                    x = asset.x;
                }
                if (asset.heightOffset) {
                    heightOffset = asset.heightOffset;
                }
            }
        });

        // adapt height and x, more parameters possible

        // Position the camera behind the marker
        const cameraPosition = new Cesium.Cartesian3(
            markerPosition.x + x, // Move in the X direction
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

    // Show the dataBaseButton when optionsBox is closed
    document.getElementById('dataBaseButton').style.display = 'block';

    // Hide the storyMapBox when optionsBox is closed
    document.getElementById('storyMapBox').style.display = 'none';
};

// Add event listener for the open options box button
document.getElementById('openOptionsBox').onclick = () => {
    document.getElementById('optionsBox').style.display = 'block';
    document.getElementById('openOptionsBox').style.display = 'none';

    // Hide the dataBaseButton when optionsBox is opened
    document.getElementById('dataBaseButton').style.display = 'none';

    // Show the storyMapBox when optionsBox is opened
    document.getElementById('storyMapBox').style.display = 'block';
};


// Loading icon element
const loadingScreen = document.getElementById('loadingScreen');

// Hide loading icon after the map uploaded
viewer.scene.globe.tileLoadProgressEvent.addEventListener((count) => {
    if (count === 0) {
        console.log('Tüm veriler yüklendi');
        loadingScreen.style.display = 'none'; // Hide
    }
});

// Show loading icon while the page is loading
window.addEventListener('load', () => {
    loadingScreen.style.display = 'flex';
});



// double-click event handler to get cartesian coordinates
/*
viewer.screenSpaceEventHandler.setInputAction(function onDoubleClick(click) {
    var cartesian = viewer.scene.pickPosition(click.position);
    console.log(cartesian);
}, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
*/
