[out:json][timeout:90];
area["boundary"="administrative"]["admin_level"="6"]["name"="Köln"]->.city;
(
  nwr(area.city)["leisure"~"^(park|playground|dog_park|garden)$"];
  nwr(area.city)["landuse"="cemetery"];
  nwr(area.city)["amenity"~"^(grave_yard|fountain|drinking_water)$"];
  node(area.city)["natural"="tree"]["name"];
);
out center;
