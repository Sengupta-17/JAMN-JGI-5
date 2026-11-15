// ============================================================================
// JAMN GAME – MARS SURVIVAL MISSION TRAINER (MILESTONE 2)
// File: data.js
// Purpose: Grounded NASA scientific reference constants, 4 Mars landing site
//          dossiers, official NASA/JPL imagery URLs with procedural fallbacks,
//          EDL stage parameters, and habitat survival systems data.
// ============================================================================

window.JAMN_DATA = {
  // Reference Mars Planetary Constants (Source: NASA Mars Science Overview)
  referenceMars: {
    gravity: "3.71 m/s² (~0.38 g)",
    meanTemp: "-60 °C (-80 °F)",
    meanPressure: "636 Pa (~6.36 mbar, <1% Earth)",
    atmosphere: "95.32% CO₂, 2.7% N₂, 1.6% Ar, 0.13% O₂",
    solDuration: "24 hr 37 min 22 sec",
    solarRadiation: "200–300 mSv/yr (unshielded cosmic & solar radiation)",
    disclaimer: "Reference Mars baseline (NASA). Local surface conditions vary significantly by elevation, latitude, and season. Human mission visuals and spacecraft telemetry represent a scientific mission simulation."
  },

  // Official NASA/JPL Surface Reference Photo for Astronaut Surface HUD
  surfaceReferencePhoto: {
    title: "NASA Perseverance Rover – Martian Surface Panorama (PIA26344)",
    url: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia26/pia26344/PIA26344.gif",
    sourceUrl: "https://science.nasa.gov/mission/mars-2020-perseverance/",
    credit: "NASA / JPL-Caltech / ASU / MSSS"
  },

  // Four Selectable Mars Landing Locations (Milestone 2 Requirement #5)
  landingSites: {
    olympus_mons: {
      id: "olympus_mons",
      code: "SITE-ALPHA // THARSIS",
      name: "Olympus Mons",
      subtitle: "Largest Known Volcano in the Solar System",
      type: "Shield Volcano",
      lat: 18.65,
      lon: -133.8, // 226.2° E
      coordsDisplay: "18.65° N, 226.2° E (133.8° W)",
      elevationDisplay: "+21.9 km (~22 km above surrounding plains)",
      elevationKm: 21.9,
      localTemp: "-75 °C (Summit diurnal range: -105 °C to -25 °C)",
      localPressure: "30 to 72 Pa (~0.05% of Earth sea level)",
      dustCondition: "Low high-altitude dust opacity; lower flanks prone to upslope dust clouds",
      waterAvailability: "Very Low (<2% bound regolith minerals; negligible surface ice)",
      startingParameters: {
        oxygen: 52,
        food: 65,
        water: 45,
        power: 88
      },
      solarPowerFactor: 1.22,
      difficulty: "EXTREME",
      terrainColor: 0xa64b2a,
      skyColor: 0x1a0c08,
      fogDensity: 0.004,
      rockDensity: 45,
      slopeDescription: "Gentle 5° average basaltic shield slopes bordered by a steep up-to-8 km basal escarpment (Olympus Rupes) and nested summit calderas.",
      scientificSummary: "Olympus Mons is a colossal basaltic shield volcano rising approximately 21.9 km (72,000 ft) above the Martian datum and spanning roughly 600 km across—comparable in area to Arizona.",
      atmosphericConditions: "Extremely tenuous atmosphere (~30–72 Pa at the summit, less than 12% of average Martian surface pressure). Negligible aerodynamic braking column for entry vehicles.",
      landingRisks: "Insufficient atmospheric column for standard supersonic parachutes; spacecraft must rely almost exclusively on high-thrust retro-propulsion. Steep cliff scarps (up to 7.7 km vertical drop) and solidified lava tubes pose severe touchdown hazards.",
      missionAdvantages: "Unobstructed high-altitude solar irradiance above most global dust storms, plus access to pristine volcanic basalt flows and potential subsurface lava tube caverns for natural radiation shielding.",
      imageUrl: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/mars/resources/detail_files/7/7664_Mars-viking-orbiter-olympus-mons-volcano-full2.jpg?w=1600&h=1480&fit=clip&crop=faces%2Cfocalpoint",
      imageCredit: "NASA / JPL – Viking 1 Orbiter Mosaic of Olympus Mons",
      sourceUrl: "https://science.nasa.gov/resource/viking-1-orbiter-image-olympus-mons/",
      secondarySourceUrl: "https://science.nasa.gov/photojournal/pj-olympus-mons-26/",
      parachuteSupported: false,
      edlNote: "High-altitude target (+21.9 km): Parachute deployment bypassed due to ultra-thin 50 Pa atmosphere; extended supersonic retro-propulsion required."
    },

    polar_ice_caps: {
      id: "polar_ice_caps",
      code: "SITE-BETA // BOREUM",
      name: "Polar Ice Caps (Planum Boreum)",
      subtitle: "Permanent Water-Ice Cap & Seasonal CO₂ Frost Sheet",
      type: "Polar Layered Deposits",
      lat: 83.5,
      lon: 15.0,
      coordsDisplay: "83.50° N, 15.00° E (Planum Boreum Margin)",
      elevationDisplay: "-2.0 km basal plain (+3.0 km ice sheet thickness)",
      elevationKm: -2.0,
      localTemp: "-110 °C (Winter CO₂ frost point -125 °C; Summer -60 °C)",
      localPressure: "650 to 780 Pa (Seasonal fluctuation up to 25% as CO₂ sublimates)",
      dustCondition: "Seasonal katabatic spiral trough winds and springtime dust-ice plumes",
      waterAvailability: "Abundant (>90% pure water-ice layered deposits beneath seasonal frost)",
      startingParameters: {
        oxygen: 78,
        food: 60,
        water: 92,
        power: 55
      },
      solarPowerFactor: 0.58,
      difficulty: "HIGH",
      terrainColor: 0xd8cfc8,
      skyColor: 0x2c221e,
      fogDensity: 0.008,
      rockDensity: 25,
      slopeDescription: "Stratified water-ice and dust layers incised by spiral Chasma Boreale troughs and circumpolar linear dune fields.",
      scientificSummary: "The Martian North Polar Cap (Planum Boreum) holds a permanent residual water-ice sheet roughly 1,000 km across and up to 3 km thick, blanketed each winter by a ~1-meter layer of solid carbon dioxide (dry ice) frost.",
      atmosphericConditions: "Moderate atmospheric pressure (~700 Pa) with strong katabatic winds descending off the polar dome and seasonal sublimation waves that drive global pressure cycles.",
      landingRisks: "Extreme cryogenic temperatures (-110 °C to -125 °C) brittle structural metals and drain battery heating reserves. Months of polar winter darkness severely restrict solar array generation, and sublimating CO₂ geysers destabilize surface footing.",
      missionAdvantages: "Direct surface access to vast water-ice reservoirs for In-Situ Resource Utilization (ISRU)—providing drinking water, breathable O₂, and liquid methane/oxygen rocket propellant.",
      imageUrl: "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/mars/resources/detail_files/3/3241_PIA13163-full2.jpg?w=792&h=633&fit=clip&crop=faces%2Cfocalpoint",
      imageCredit: "NASA / JPL-Caltech / MSSS – MRO MARCI North Polar Cap (PIA13163)",
      sourceUrl: "https://science.nasa.gov/resource/northern-ice-cap-of-mars/",
      secondarySourceUrl: "https://www.jpl.nasa.gov/images/pia00009-north-polar-ice-cap/",
      parachuteSupported: true,
      edlNote: "Low basal elevation (-2.0 km): Supersonic parachute and thermal retro-thrusters active; thermal conditioning prevents ice-crust collapse."
    },

    valles_marineris: {
      id: "valles_marineris",
      code: "SITE-GAMMA // COPRATES",
      name: "Valles Marineris",
      subtitle: "Grand Tectonic Canyon System of Mars",
      type: "Tectonic Rift Valley System",
      lat: -13.9,
      lon: -59.2, // 300.8° E
      coordsDisplay: "13.90° S, 300.80° E (Coprates Chasma Floor)",
      elevationDisplay: "-7.0 km (~7 to 8 km below surrounding plateau)",
      elevationKm: -7.0,
      localTemp: "-45 °C (Equatorial canyon floor reaches +5 °C at local noon)",
      localPressure: "920 to 1,050 Pa (~50% denser than Martian mean)",
      dustCondition: "Frequent canyon-channeled wind gusts and morning fog/haze",
      waterAvailability: "Moderate (Hydrated phyllosilicates & sulfates exposed in canyon walls)",
      startingParameters: {
        oxygen: 70,
        food: 75,
        water: 68,
        power: 72
      },
      solarPowerFactor: 0.92,
      difficulty: "SEVERE",
      terrainColor: 0x9b4422,
      skyColor: 0x351a10,
      fogDensity: 0.011,
      rockDensity: 80,
      slopeDescription: "Towering 7 km layered basalt and phyllosilicate cliff walls enclosing rugged landslide aprons, fault scarps, and wind-rippled dune floors.",
      scientificSummary: "Stretching approximately 4,000 km long, up to 200 km wide, and up to 7–8 km deep, Valles Marineris is a vast tectonic crack in the Martian crust formed as the Tharsis volcanic bulge uplifted to the west.",
      atmosphericConditions: "Significantly higher atmospheric pressure (~950–1,050 Pa) on the deep canyon floor, accompanied by turbulent thermal updrafts and canyon-wall wind shear.",
      landingRisks: "NASA's InSight and rover site assessments noted that Valles Marineris has steep wall cliffs, massive boulder-strewn landslide deposits, narrow landing ellipses, and strong crosswinds that challenge terminal guidance.",
      missionAdvantages: "Unmatched geological cross-section exposing billions of years of layered volcanic and water-altered phyllosilicate strata, warmer equatorial temperatures, and higher air density.",
      imageUrl: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00422/PIA00422.jpg",
      imageCredit: "NASA / JPL / USGS – Viking Orbiter Mosaic of Valles Marineris (PIA00422)",
      sourceUrl: "https://science.nasa.gov/photojournal/valles-marineris/",
      secondarySourceUrl: "https://www.jpl.nasa.gov/images/pia10074-the-layer-cake-walls-of-valles-marineris/",
      parachuteSupported: true,
      edlNote: "Deep canyon floor (-7.0 km): Dense atmospheric column enables parachute deceleration, with active Terrain Relative Navigation (TRN) avoiding canyon walls."
    },

    hellas_basin: {
      id: "hellas_basin",
      code: "SITE-DELTA // HELLAS",
      name: "Hellas Basin (Hellas Planitia)",
      subtitle: "Deepest Ancient Impact Basin on Mars",
      type: "Multi-Ring Impact Basin",
      lat: -42.4,
      lon: 70.5,
      coordsDisplay: "42.40° S, 70.50° E (Hellas Planitia Floor)",
      elevationDisplay: "-7.15 km (Over 8 km below surrounding rim)",
      elevationKm: -7.15,
      localTemp: "-50 °C (Mid-southern latitude seasonal swings: -95 °C to 0 °C)",
      localPressure: "1,155 to 1,240 Pa (~85% denser than Martian datum)",
      dustCondition: "High dust optical depth; frequent basin-wide dust storms & winter frost",
      waterAvailability: "Moderate-High (Subsurface lobate debris aprons & buried glacial ice)",
      startingParameters: {
        oxygen: 82,
        food: 62,
        water: 58,
        power: 50
      },
      solarPowerFactor: 0.78,
      difficulty: "MODERATE",
      terrainColor: 0xb55d35,
      skyColor: 0x3d2214,
      fogDensity: 0.013,
      rockDensity: 40,
      slopeDescription: "Broad, low-elevation basin plains with pitted landforms, ancient lacustrine sediments, and glacial debris aprons.",
      scientificSummary: "Hellas Planitia is an ancient southern-hemisphere impact basin approximately 2,300 km in diameter and over 7.1 to 8 km deep, holding the lowest surface elevations and highest atmospheric pressures on Mars.",
      atmosphericConditions: "Peak Martian surface pressure (~1,155–1,240 Pa—nearly double the global 636 Pa average), offering the thickest aerodynamic cushion on the planet.",
      landingRisks: "Hellas Basin is a primary nucleation zone for major southern-hemisphere and global Martian dust storms, which can sharply reduce solar array output and obscure optical landing sensors.",
      missionAdvantages: "Maximum atmospheric density provides the safest aerodynamic braking margin for heavy human landers, natural atmospheric radiation attenuation, and access to buried glacial ice deposits.",
      imageUrl: "https://assets.science.nasa.gov/content/dam/science/psd/mars/downloadable_items/3/9/39023_Mars_Global_Surveyor_Hellas_MOLA_.jpg",
      imageCredit: "NASA / JPL / GSFC – Mars Global Surveyor MOLA Topography of Hellas Basin",
      sourceUrl: "https://science.nasa.gov/resource/topographic-map-of-hellas-planitia/",
      secondarySourceUrl: "https://www.jpl.nasa.gov/images/pia13097-intra-crater-structure-in-nw-hellas-basin-mars/",
      parachuteSupported: true,
      edlNote: "Maximum atmospheric depth (-7.15 km, ~1,180 Pa): Optimal aerodynamic braking and supersonic parachute efficiency before terminal powered descent."
    }
  },

  // 9-Stage Entry, Descent, and Landing (EDL) Sequence (Requirement #7)
  edlStages: [
    {
      index: 0,
      name: "ORBITAL POSITIONING",
      altitudeKm: 250.0,
      speedMs: 3450,
      status: "Aligning reaction control thrusters (RCS) to de-orbit burn attitude vector",
      heatFlux: "0.0 kW/m²",
      gLoad: "0.00 g"
    },
    {
      index: 1,
      name: "DE-ORBIT MANOEUVRE",
      altitudeKm: 185.0,
      speedMs: 3320,
      status: "Retrograde orbital braking burn complete; periapsis intersecting Mars atmosphere",
      heatFlux: "1.2 kW/m²",
      gLoad: "0.45 g"
    },
    {
      index: 2,
      name: "ATMOSPHERIC ENTRY INTERFACE",
      altitudeKm: 125.0,
      speedMs: 4600,
      status: "Encountering upper CO₂ thermosphere; guided lifting-body bank control active",
      heatFlux: "48.0 kW/m²",
      gLoad: "1.20 g"
    },
    {
      index: 3,
      name: "HEAT SHIELD PEAK HEATING",
      altitudeKm: 48.0,
      speedMs: 3100,
      status: "Peak hypersonic compression plasma (~1,500 °C); PICA-X thermal shield nominal",
      heatFlux: "390.0 kW/m²",
      gLoad: "3.85 g"
    },
    {
      index: 4,
      name: "SUPERSONIC PARACHUTE / DECEL",
      altitudeKm: 11.5,
      speedMs: 430,
      status: "Mach 1.8 deceleration phase; supersonic drag / high-altitude retro-braking engaged",
      heatFlux: "12.0 kW/m²",
      gLoad: "2.40 g"
    },
    {
      index: 5,
      name: "POWERED DESCENT INITIATION",
      altitudeKm: 2.4,
      speedMs: 95,
      status: "Heat shield jettisoned; 4x Methalox landing engines ignited; radar altimeter locked",
      heatFlux: "3.5 kW/m²",
      gLoad: "1.65 g"
    },
    {
      index: 6,
      name: "LANDING APPROACH & HAZARD AVOIDANCE",
      altitudeKm: 0.35,
      speedMs: 18,
      status: "Terrain Relative Navigation (TRN) scanning boulders & slope gradients; diverting to flat pad",
      heatFlux: "1.1 kW/m²",
      gLoad: "1.10 g"
    },
    {
      index: 7,
      name: "TOUCHDOWN",
      altitudeKm: 0.0,
      speedMs: 0,
      status: "Landing gear shock struts compressed; surface regolith dust plume settling; engines cutoff",
      heatFlux: "0.2 kW/m²",
      gLoad: "0.38 g"
    },
    {
      index: 8,
      name: "LANDING CONFIRMATION",
      altitudeKm: 0.0,
      speedMs: 0,
      status: "Spacecraft stable on Martian surface. EVA suit pressurization & airlock checks complete.",
      heatFlux: "0.0 kW/m²",
      gLoad: "0.38 g"
    }
  ]
};

if (window.JAMN_DATA && window.JAMN_DATA.landingSites) {
  window.JAMN_DATA.landingSites.north_polar = window.JAMN_DATA.landingSites.polar_ice_caps;
}
