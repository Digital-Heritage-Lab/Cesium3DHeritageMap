// configuration for Cesium3DHeritageMap
export const config = {
    // Cesium Ion access token
    ionAccessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMjhiN2RhOC1lYThlLTQ3NGEtYWQ3NC05YjRmOTI5M2M0OWEiLCJpZCI6NzgzODEsImlhdCI6MTcxMDc5ODQ0MH0.nuQD0pwTIy_aHKIqEGLzrhxCCCelkCHyNeJURm3v-Q8",

    // API URLs
    monumentsRemoteUrl: 'https://opendem.info/cgi-bin/getDenkmal.py',
    monumentsLocalUrl: 'Data/denkmaeler.json',
    assetsUrl: 'Data/assets.json',

    // Imagery & Terrain settings
    enable3DTiles: true,
    preferOnlineImagery: true,

    // Google Photorealistic 3D Tiles
    useGooglePhotorealistic: true,
    googlePhotorealisticAssetId: 2275207,

    // View settings - Centered on Cologne Cathedral (Kölner Dom)
    cologne: {
        longitude: 6.9583,
        latitude: 50.9413,
        height: 800,
        pitch: -30.0
    },

    // Camera Offsets (Fly-to)
    defaultCameraOffset: {
        x: 400,
        y: 50,
        height: 200,
        pitch: -60.0
    }
};
