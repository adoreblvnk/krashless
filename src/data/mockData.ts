export const HOTSPOTS = [
  { 
    id: 'hg-8-535', 
    name: 'Hougang Ave 8 (Blk 535 Intersection)', 
    lat: 1.3760278, 
    lng: 103.8898611,
    video: '/mock-cctv.mp4',
    poster: '/mock-cctv.jpg',
    zoning: {
      zone_type: "School Zone (Proximity to Montfort Secondary & Junior School)",
      demographics: "High elderly population (Block 535), heavy student foot traffic during peak hours.",
      traffic_profile: "High volume of heavy vehicles, SBS Transit double-decker route (Services 74, 119, 147).",
      historical_incidents: "Frequent pedestrian near-misses on slip road during heavy rain.",
      violations_ytd: { red_light: 142, speeding: 87 },
      light_duration_sec: { red: 90, amber: 5, green: 45 }
    }
  },
  {
    id: 'orchard-rd',
    name: 'Orchard Rd',
    lat: 1.302796,
    lng: 103.835867,
    video: '/mock-cctv.mp4',
    poster: '/mock-cctv2.jpg',
    zoning: {
      zone_type: "Commercial / Shopping District",
      demographics: "Extremely high pedestrian foot traffic, tourists, shoppers.",
      traffic_profile: "High volume of private vehicles, taxis, and ride-hailing services.",
      historical_incidents: "Frequent jaywalking and sudden vehicle stops.",
      violations_ytd: { red_light: 65, speeding: 102 },
      light_duration_sec: { red: 120, amber: 5, green: 60 }
    }
  },
  {
    id: 'upp-aljunied',
    name: 'Upper Aljunied Road',
    lat: 1.337655,
    lng: 103.872347,
    video: '/mock-cctv.mp4',
    poster: '/mock-cctv3.jpg',
    zoning: {
      zone_type: "Residential / Commercial Mix",
      demographics: "Mix of local residents and workers. Moderate pedestrian flow.",
      traffic_profile: "Heavy through-traffic, delivery vehicles, buses.",
      historical_incidents: "Speeding incidents during non-peak hours.",
      violations_ytd: { red_light: 89, speeding: 134 },
      light_duration_sec: { red: 75, amber: 4, green: 50 }
    }
  }
];

export const HOTSPOT = HOTSPOTS[0];

export const SINGAPORE_MAP_VIEW = {
  lat: 1.3521,
  lng: 103.8198,
  altitude: 0,
};

export const LTA_ZONING_DATA = HOTSPOTS[0].zoning;

export const INITIAL_LIVE_STATS = { vehicles: 1405, pedestrians: 842, heavy_trucks: 210 };
