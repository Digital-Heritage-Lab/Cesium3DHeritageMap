/* Cesium adapter. UI receives feature IDs and view context, not engine internals. */
window.GreenMap = class GreenMap {
  constructor(viewer, onSelect, onMove) {
    this.viewer = viewer;
    this.sources = new Map();
    this.entities = new Map();
    this.treeIds = new Set();
    this.visibleTreeFeatures = [];
    this.reportData = [];
    this.reportVisible = false;
    this.reportFilters = { category: 'all', status: 'all' };
    this.filters = {};
    this.visible = new Set(["parks", "trees", "water"]);
    this.opacity = {};
    this.onMove = onMove;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#edf0e7");
    viewer.scene.globe.maximumScreenSpaceError = 1;
    const layer = viewer.imageryLayers.get(0);
    if (layer) {
      layer.saturation = 0.65;
      layer.brightness = 1.02;
    }
    this.removeMoveListener = viewer.camera.moveEnd.addEventListener(() => {
      this.refreshTrees();
      onMove();
    });
    viewer.screenSpaceEventHandler.setInputAction((event) => {
      const picked = viewer.scene.pick(event.position);
      if (picked?.id?.greenFeatureId) onSelect(picked.id.greenFeatureId);
      else if (Array.isArray(picked?.id) && picked.id.length) {
        const position = picked.id[0].position.getValue(viewer.clock.currentTime);
        const center = Cesium.Cartographic.fromCartesian(position);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromRadians(
            center.longitude,
            center.latitude,
            Math.max(350, viewer.camera.positionCartographic.height * 0.45)
          ),
          duration: 0.6,
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    viewer.screenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );
  }
  async load() {
    for (const theme of GreenData.themes) {
      const source = new Cesium.CustomDataSource(theme.id);
      source.clustering.enabled = true;
      source.clustering.pixelRange = 80;
      source.clustering.minimumClusterSize = 2;
      source.clustering.clusterLabels = false;
      source.clustering.clusterEvent.addEventListener((entities, cluster) => {
        cluster.billboard.show = false;
        cluster.label.show = true;
        cluster.label.text = String(entities.length);
        cluster.label.font = "700 14px sans-serif";
        cluster.label.fillColor = Cesium.Color.WHITE;
        cluster.label.showBackground = true;
        cluster.label.backgroundColor = Cesium.Color.fromCssColorString(theme.color);
        cluster.label.backgroundPadding = new Cesium.Cartesian2(12, 9);
        cluster.label.disableDepthTestDistance = Number.POSITIVE_INFINITY;
      });
      const marker = this.marker(theme);
      for (const feature of GreenData.search("", theme.id)) {
        const [lon, lat] = feature.geometry.coordinates;
        const hasName = !feature.properties.name.includes(" · OSM ");
        const entity = source.entities.add({
          id: feature.id,
          name: feature.properties.name,
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 5),
          billboard: {
            image: marker,
            width: 38,
            height: 44,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: feature.properties.name,
            show: hasName,
            font: "600 13px sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#244937"),
            showBackground: true,
            backgroundColor: Cesium.Color.WHITE.withAlpha(0.95),
            backgroundPadding: new Cesium.Cartesian2(7, 5),
            pixelOffset: new Cesium.Cartesian2(0, 12),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
              0,
              7000
            ),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        entity.greenFeatureId = feature.id;
        entity.greenNamed = hasName;
        this.entities.set(feature.id, entity);
      }
      await this.viewer.dataSources.add(source);
      source.show = this.visible.has(theme.id);
      this.sources.set(theme.id, source);
    }
    const reports = new Cesium.CustomDataSource('reports');
    reports.clustering.enabled = true;
    reports.clustering.pixelRange = 55;
    reports.clustering.minimumClusterSize = 2;
    reports.clustering.clusterLabels = false;
    reports.clustering.clusterEvent.addEventListener((entities, cluster) => {
      cluster.billboard.show = false;
      cluster.label.show = true;
      cluster.label.text = String(entities.length);
      cluster.label.font = '700 13px sans-serif';
      cluster.label.fillColor = Cesium.Color.WHITE;
      cluster.label.showBackground = true;
      cluster.label.backgroundColor = Cesium.Color.fromCssColorString('#8a6840');
      cluster.label.backgroundPadding = new Cesium.Cartesian2(9, 6);
      cluster.label.disableDepthTestDistance = Number.POSITIVE_INFINITY;
    });
    await this.viewer.dataSources.add(reports);
    reports.show = false;
    this.sources.set('reports', reports);
    this.viewer.scene.requestRender();
  }
  setReportData(reports) {
    const source = this.sources.get('reports');
    if (!source) return;
    for (const entity of source.entities.values) this.entities.delete(entity.id);
    source.entities.removeAll();
    this.reportData = reports;
    const colors = { open: '#b45342', in_progress: '#ae7b2e', closed: '#438263', other: '#61746d' };
    const markers = Object.fromEntries(Object.entries(colors).map(([status, color]) =>
      [status, this.marker({ color, icon: 'pin' })]));
    for (const report of GreenReports.filter(this.reportFilters.category, this.reportFilters.status)) {
      const id = `report-${report.id}`;
      const entity = source.entities.add({
        id, name: `${report.category} · #${report.id}`,
        position: Cesium.Cartesian3.fromDegrees(report.coordinates.lng, report.coordinates.lat, 5),
        billboard: { image: markers[report.status] || markers.other, width: 28, height: 33,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY },
      });
      entity.greenFeatureId = id;
      this.entities.set(id, entity);
    }
    this.viewer.scene.requestRender();
    this.onMove();
  }
  setReportFilters(filters) {
    this.reportFilters = filters;
    this.setReportData(this.reportData);
  }
  setReportVisibility(show) {
    this.reportVisible = show;
    this.sources.get('reports').show = show;
    this.viewer.scene.requestRender();
    this.onMove();
  }
  reportsInView() {
    if (!this.reportVisible) return [];
    const bounds = this.viewer.camera.computeViewRectangle(this.viewer.scene.globe.ellipsoid);
    if (!bounds) return [];
    return GreenReports.filter(this.reportFilters.category, this.reportFilters.status).filter((report) =>
      Cesium.Rectangle.contains(bounds, Cesium.Cartographic.fromDegrees(report.coordinates.lng, report.coordinates.lat)));
  }
  focusReport(report) {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(report.coordinates.lng, report.coordinates.lat, 1000),
      orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 }, duration: 1.1,
    });
  }
  marker(theme) {
    const symbol = window.GreenAtlas.icon(theme.icon)
      .replace("<svg ", '<svg x="11" y="10" width="22" height="22" ')
      .replace('stroke="currentColor"', 'stroke="white"');
    return (
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52"><path d="M22 50 13 37a19 19 0 1 1 18 0Z" fill="${theme.color}" stroke="white" stroke-width="2.5"/>${symbol}</svg>`
      )
    );
  }
  viewBounds() {
    const rectangle = this.viewer.camera.computeViewRectangle(this.viewer.scene.globe.ellipsoid);
    return rectangle ? [rectangle.west, rectangle.south, rectangle.east, rectangle.north]
      .map(Cesium.Math.toDegrees) : null;
  }
  refreshTrees() {
    const source = this.sources.get('trees');
    if (!source || !GreenTrees.ready) return;
    const bounds = this.viewBounds();
    const nearby = this.visible.has('trees') && this.viewer.camera.positionCartographic.height <= 2200
      ? GreenTrees.inBounds(bounds, 3000) : [];
    const next = new Set(nearby.map((feature) => feature.id));
    for (const id of this.treeIds) {
      if (next.has(id)) continue;
      source.entities.remove(this.entities.get(id));
      this.entities.delete(id);
      this.treeIds.delete(id);
    }
    const marker = this.marker(GreenData.theme('trees'));
    for (const feature of nearby) {
      if (this.treeIds.has(feature.id)) continue;
      const [lon, lat] = feature.geometry.coordinates;
      const entity = source.entities.add({
        id: feature.id,
        name: feature.properties.name,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 5),
        billboard: { image: marker, width: 28, height: 33,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY },
      });
      entity.greenFeatureId = feature.id;
      this.entities.set(feature.id, entity);
      this.treeIds.add(feature.id);
    }
    this.visibleTreeFeatures = nearby;
    if (this.selectedId && this.entities.has(this.selectedId)) {
      this.selected = this.entities.get(this.selectedId);
      this.selected.billboard.scale = 1.3;
    }
    this.viewer.scene.requestRender();
  }
  setVisibility(id, show) {
    if (!this.sources.has(id)) return;
    if (show) this.visible.add(id);
    else this.visible.delete(id);
    this.sources.get(id).show = show;
    if (id === 'trees') this.refreshTrees();
    this.viewer.scene.requestRender();
    this.onMove();
  }
  setFilter(id, filters) {
    this.filters[id] = filters;
    const ids = new Set(GreenData.filtered(id, filters).map((f) => f.id));
    for (const entity of this.sources.get(id).entities.values) {
      if (id === 'trees' && this.treeIds.has(entity.id)) continue;
      entity.show = ids.has(entity.id);
    }
    this.viewer.scene.requestRender();
    this.onMove();
  }
  setOpacity(id, value) {
    this.opacity[id] = value;
    for (const e of this.sources.get(id).entities.values) {
      e.billboard.color = Cesium.Color.WHITE.withAlpha(value);
      if (e.label) e.label.show = value > 0 && e.greenNamed;
    }
    this.viewer.scene.requestRender();
  }
  inView(feature, bounds) {
    if (!bounds) return false;
    const [lon, lat] = feature.geometry.coordinates;
    return Cesium.Rectangle.contains(
      bounds,
      Cesium.Cartographic.fromDegrees(lon, lat)
    );
  }
  context(themeId, onlyActive = true) {
    const bounds = this.viewer.camera.computeViewRectangle(this.viewer.scene.globe.ellipsoid);
    if (!bounds) return [];
    return GreenData.collection.features.concat(this.visibleTreeFeatures).filter(
      (f) =>
        (!themeId || f.properties.theme === themeId) &&
        (!onlyActive || this.visible.has(f.properties.theme)) &&
        this.entities.get(f.id)?.show &&
        this.inView(f, bounds)
    );
  }
  focus(id) {
    const feature = GreenData.collection.features.find((f) => f.id === id) || GreenTrees.get(id);
    if (!feature) return;
    this.setVisibility(feature.properties.theme, true);
    if (this.entities.get(id) && !this.entities.get(id).show)
      this.setFilter(feature.properties.theme, {});
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        ...feature.geometry.coordinates,
        feature.properties.sourceKind === 'cadastre' ? 900 : 2400
      ),
      orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
      duration: 1.1,
    });
  }
  select(id) {
    if (this.selected) this.selected.billboard.scale = 1;
    this.selectedId = id;
    this.selected = this.entities.get(id);
    if (this.selected) this.selected.billboard.scale = 1.3;
    this.viewer.scene.requestRender();
  }
  home() {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(6.96, 50.942, 15500),
      orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
      duration: 1,
    });
  }
  zoomTheme(id) {
    this.setVisibility(id, true);
    const coords = GreenData.filtered(id, this.filters[id]).map(
      (f) => f.geometry.coordinates
    );
    if (!coords.length) return false;
    const lons = coords.map((c) => c[0]),
      lats = coords.map((c) => c[1]);
    this.viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(
        Math.min(...lons) - 0.01,
        Math.min(...lats) - 0.007,
        Math.max(...lons) + 0.01,
        Math.max(...lats) + 0.007
      ),
      duration: 1,
    });
    return true;
  }
  destroy() {
    this.removeMoveListener();
    for (const source of this.sources.values())
      this.viewer.dataSources.remove(source, true);
  }
};
