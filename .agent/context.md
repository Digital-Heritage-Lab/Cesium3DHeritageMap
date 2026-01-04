# Project Context: Cesium3DHeritageMap

## Overview
This repository is based on **CesiumJS 1.117.0** and contains a custom application for visualizing 3D Heritage Maps. It integrates 3D Tiles, GeoJSON data, and custom UI components to provide an interactive geospatial experience.

## Repository Structure
- `Apps/`: Main application directory.
  - `3DHeritageMapApp.html`: Entry point for the custom app.
  - `3DHeritageScripts.js`: Core logic for the application (Cesium Viewer initialization, data loading, UI interaction).
  - `3DHeritageStyles.css`: Custom styles for the app.
  - `Data/`: Local data files (Assets, Denkmäler).
- `Source/`: CesiumJS source code (Engine and Widgets).
- `Build/`: Generated build artifacts (DO NOT EDIT MANUALLY).
- `server.js`: Node.js/Express server for local development.
- `gulpfile.js`: Build and task automation.

## Key Technologies
- **CesiumJS**: 3D Globe and Mapping library.
- **Node.js**: Backend server and build environment.
- **Express**: Web server framework.
- **Gulp**: Task runner for builds, minification, and testing.
- **esbuild**: Fast JavaScript bundling.

## External Data & Services
- **Cesium Ion**: Used for streaming 3D Tiles and terrain.
- **OpenDEM API**: Fetches monument data (`getDenkmal.py`).
