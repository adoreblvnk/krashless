export const HOTSPOT = { 
  id: 'hg-8-535', 
  name: 'Hougang Ave 8 (Blk 535 Intersection)', 
  lat: 1.3760278, 
  lng: 103.8898611 
};

export const SINGAPORE_MAP_VIEW = {
  lat: 1.3521,
  lng: 103.8198,
  altitude: 0,
};

export const LTA_ZONING_DATA = {
  zone_type: "School Zone (Proximity to Montfort Secondary & Junior School)",
  demographics: "High elderly population (Block 535), heavy student foot traffic during peak hours.",
  traffic_profile: "High volume of heavy vehicles, SBS Transit double-decker route (Services 74, 119, 147).",
  historical_incidents: "Frequent pedestrian near-misses on slip road during heavy rain.",
  violations_ytd: { red_light: 142, speeding: 87 },
  light_duration_sec: { red: 90, amber: 5, green: 45 }
};

export const INITIAL_LIVE_STATS = { vehicles: 1405, pedestrians: 842, heavy_trucks: 210 };
