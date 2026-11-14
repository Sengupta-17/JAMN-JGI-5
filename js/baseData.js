/**
 * Junior Astronaut Mission Trainer - Segment 3 Base Data & Specifications
 * Based on authentic NASA ECLSS, CHAPEA (Mars Dune Alpha), and Mars Design Reference Architecture.
 */

export const LANDING_SITES = {
  north_polar: {
    id: 'north_polar',
    name: 'North Polar Ice Cap (Planum Boreum)',
    coordinates: '84.8°N, 0.0°E',
    elevation: '-2.0 km',
    surfaceTemp: '-125°C to -65°C',
    atmosphereDensity: '0.70 kPa',
    description: 'High latitude permafrost region with massive water-ice reserves. Extreme cold and long polar nights pressure heating and solar power, but water harvesting is abundant.',
    // STRICTLY 4 BASE PARAMETERS:
    startingParameters: {
      oxygen: 78,
      food: 60,
      water: 92, // Rich in water ice
      power: 55  // Low solar insolation, high heating demand
    },
    hazards: ['Extreme temperatures', 'Water scarcity (ice melting required)', 'Low gravity', 'Radiation']
  },
  olympus_mons: {
    id: 'olympus_mons',
    name: 'Olympus Mons Caldera Rim',
    coordinates: '18.65°N, 226.2°E',
    elevation: '+21.3 km',
    surfaceTemp: '-85°C to -20°C',
    atmosphereDensity: '0.15 kPa (near vacuum)',
    description: 'The tallest volcano in the solar system. High above Mars dust haze offering superior solar irradiance, but extremely thin atmospheric pressure makes oxygen extraction and airlock containment challenging.',
    startingParameters: {
      oxygen: 52, // Very low ambient CO2 pressure for MOXIE
      food: 65,
      water: 45, // Dry volcanic basalt terrain
      power: 88  // High solar flux above atmospheric dust
    },
    hazards: ['Low pressure', 'Radiation (thin atmosphere shield)', 'Extreme temperatures', 'Low gravity']
  },
  valles_marineris: {
    id: 'valles_marineris',
    name: 'Valles Marineris (Coprates Chasma)',
    coordinates: '14.0°S, 301.0°E',
    elevation: '-7.0 km',
    surfaceTemp: '-70°C to +5°C',
    atmosphereDensity: '0.95 kPa',
    description: 'The Grand Canyon of Mars, descending 7 km into the crust. Towering cliffs offer natural radiation shielding and mild microclimates, offering a balanced baseline for operations.',
    startingParameters: {
      oxygen: 70,
      food: 75,
      water: 68,
      power: 72
    },
    hazards: ['Dust storms (canyon wind funnels)', 'Extreme temperatures', 'Low gravity', 'Food production']
  },
  hellas_basin: {
    id: 'hellas_basin',
    name: 'Hellas Planitia Basin',
    coordinates: '42.7°S, 70.0°E',
    elevation: '-7.2 km',
    surfaceTemp: '-60°C to +15°C',
    atmosphereDensity: '1.24 kPa (highest on Mars)',
    description: 'The deepest impact basin on Mars with the thickest atmospheric envelope, allowing liquid water metastability at peak temperatures. However, it is the primary spawning ground for global dust storms.',
    startingParameters: {
      oxygen: 82, // High atmospheric density aids Sabatier/MOXIE
      food: 62,
      water: 58,
      power: 50  // High dust storm frequency severely degrades solar arrays
    },
    hazards: ['Dust storms', 'Radiation', 'Water scarcity', 'Low gravity']
  }
};

export const BASE_MODULES = [
  {
    id: 'eclss_module',
    name: 'ECLSS Atmospheric & Air Revitalization',
    code: 'MOD-01 // ECLSS',
    category: 'Life Support',
    primaryParameter: 'oxygen',
    icon: 'wind',
    status: 'nominal',
    summary: 'Controls the closed-loop breathable atmosphere: scrubs metabolic CO2, synthesizes O2 via electrolysis and MOXIE, and filters trace organic contaminants.',
    components: [
      {
        name: 'Oxygen Generation Assembly (OGA)',
        tag: 'OGA-201',
        type: 'Proton Exchange Membrane (PEM) Water Electrolysis',
        specs: 'Output: 5.4 kg O2/day, Operating Pressure: 101.3 kPa',
        health: 98,
        description: 'Splits recycled water into breathable O2 and hydrogen feed gas for the Sabatier reactor.'
      },
      {
        name: 'Carbon Dioxide Removal Assembly (CDRA)',
        tag: 'CDRA-104',
        type: 'Dual-bed Regenerative Zeolite Amine Sorbent',
        specs: 'CO2 scrub capacity: 4.8 kg/day, Desorption temp: 205°C',
        health: 95,
        description: 'Continuously removes human CO2 from the cabin air before concentration exceeds 0.3%.'
      },
      {
        name: 'Sabatier Methanation Reactor',
        tag: 'SAB-302',
        type: 'Catalytic Hydrogenation (Ru/Al2O3)',
        specs: 'Efficiency: 92%, Water recovery rate: 1.8 L/hr',
        health: 96,
        description: 'Reacts scrubbed CO2 with waste hydrogen to generate water (recycled to OGA) and methane exhaust.'
      },
      {
        name: 'Trace Contaminant Control System (TCCS)',
        tag: 'TCCS-012',
        type: 'High-Temperature Catalytic Oxidizer & Charcoal Bed',
        specs: 'Volatile Organic Compound removal > 99.4%',
        health: 99,
        description: 'Eliminates carbon monoxide, methane, ethanol, and acetone off-gassed by crew and electronics.'
      }
    ],
    possibleFailures: [
      {
        id: 'cdra_sorbent_saturation',
        title: 'CDRA Zeolite Desiccant Saturation',
        severity: 'critical',
        description: 'Desiccant canister failed to cycle thermally. Carbon dioxide concentration rising at +0.08% per hour.',
        repairAction: 'Cycle Thermal Regeneration Heater & Purge Amine Bed',
        targetParameter: 'oxygen',
        penaltyRate: 1.5
      },
      {
        id: 'sabatier_valve_stick',
        title: 'Sabatier Hydrogen Injection Valve Jam',
        severity: 'warning',
        description: 'Proportional regulator stuck at 15% aperture. Reaction chamber temperature dropping below catalytic threshold.',
        repairAction: 'Electromechanical Actuator Overdrive & Valve Flush',
        targetParameter: 'oxygen',
        penaltyRate: 0.8
      }
    ]
  },
  {
    id: 'hydroponics_module',
    name: 'Bioregenerative Agri-Pod & Food Production',
    code: 'MOD-02 // BIO-FARM',
    category: 'Biomass & Nutrition',
    primaryParameter: 'food',
    icon: 'sprout',
    status: 'nominal',
    summary: 'High-density vertical aeroponic and LED growth racks producing fresh caloric crops, microgreens, and high-protein spirulina cultures.',
    components: [
      {
        name: 'Vertical Aeroponic Towers',
        tag: 'AERO-T4',
        type: 'High-Pressure Ultrasonic Nutrient Misting Array',
        specs: '36 rotary columns, 520 active crop slots',
        health: 97,
        description: 'Suspends root systems in dark chambers misted with oxygen-saturated nutrient solution every 45 seconds.'
      },
      {
        name: 'Photosynthetic LED Luminaire Grid',
        tag: 'LUM-880',
        type: 'Narrow-band PAR Emitters (450nm Blue / 660nm Deep Red)',
        specs: 'PPFD: 850 µmol/m²/s, Photoperiod: 16h light / 8h dark',
        health: 94,
        description: 'Delivers precise photosynthetic photon flux to maximize carbohydrate and biomass yields.'
      },
      {
        name: 'Microbial Nutrient Digestion Loop',
        tag: 'NUT-11',
        type: 'Anaerobic Bioreactor & Mineral Ion Doser',
        specs: 'N-P-K auto-titration accuracy: ±0.05 pH',
        health: 98,
        description: 'Recycles organic crop residue and extracted minerals into sterile hydroponic fertilizer.'
      },
      {
        name: 'Transpiration Condensate Collector',
        tag: 'TRANS-09',
        type: 'Cold-plate Dehumidification Collector',
        specs: 'Collection: 32 L/day pure water back to WRS',
        health: 100,
        description: 'Captures 95% of moisture evaporated through plant leaves and routes it directly to water storage.'
      }
    ],
    possibleFailures: [
      {
        id: 'aeroponic_mister_clog',
        title: 'Root-Zone Ultrasonic Mister Clog',
        severity: 'critical',
        description: 'Mineral salt precipitation clogged 6 misting manifolds in Tower B. Roots beginning to desiccate.',
        repairAction: 'Sonic Cavitation Flush & Recalibrate Injection Pressure',
        targetParameter: 'food',
        penaltyRate: 1.2
      },
      {
        id: 'led_driver_overheat',
        title: 'Spectrum LED Luminaire Driver Overheat',
        severity: 'warning',
        description: 'Thermal interface paste degraded on primary LED array. Light output throttled by 45%.',
        repairAction: 'Switch to Auxiliary Coolant Loop & Rebalance Lumens',
        targetParameter: 'food',
        penaltyRate: 0.7
      }
    ]
  },
  {
    id: 'water_recovery_module',
    name: 'Water Recovery & Subsurface ISRU Extraction',
    code: 'MOD-03 // HYDRO-REC',
    category: 'Water Reclamation',
    primaryParameter: 'water',
    icon: 'droplets',
    status: 'nominal',
    summary: 'Achieves >98% closed-loop water recovery using vapor compression distillation, multi-filtration beds, and subsurface regolith ice melt extraction.',
    components: [
      {
        name: 'Vapor Compression Distillation Assembly (VCD)',
        tag: 'VCD-401',
        type: 'Centrifugal Vacuum Distillation (Urine Processor)',
        specs: 'Recovery Efficiency: 93.5% from greywater & urine',
        health: 96,
        description: 'Distills wastewater in a rotating centrifuge under low pressure to separate pure vapor from heavy brine.'
      },
      {
        name: 'Catalytic Water Processor Assembly (WPA)',
        tag: 'WPA-202',
        type: 'Multi-filtration Bed + High-Temp Catalytic Reactor',
        specs: 'Throughput: 6.8 kg/hr, Organic Carbon < 100 ppb',
        health: 99,
        description: 'Destroys volatile organic impurities at 130°C and mineralizes water to potable WHO/NASA standards.'
      },
      {
        name: 'Rodriguez Well Subsurface Ice Extractor',
        tag: 'ROD-WELL',
        type: 'Thermal Melt Probe & Permafrost Well Pump',
        specs: 'Sub-surface depth: 2.8m, Melt capacity: 45 L/day',
        health: 91,
        description: 'Circulates warm glycol down a sealed drillhole to create a subterranean water cavity in glaciated regolith.'
      },
      {
        name: 'Acoustic Bio-Contaminant Sensor Array',
        tag: 'ABCS-08',
        type: 'Laser Raman Spectroscopy & Conductivity Sensor',
        specs: 'Real-time potability certification: 99.98% pure',
        health: 100,
        description: 'Guarantees water purity and instantly isolates buffer tanks if any microbial anomaly is detected.'
      }
    ],
    possibleFailures: [
      {
        id: 'vcd_centrifuge_imbalance',
        title: 'VCD Distillation Centrifuge Rotor Imbalance',
        severity: 'critical',
        description: 'Excess mineral scale in centrifuge drum causing 4.2g harmonic vibration. Automatic shutdown pending.',
        repairAction: 'Execute Descaling Cycle & Re-center Centrifuge Bearings',
        targetParameter: 'water',
        penaltyRate: 1.4
      },
      {
        id: 'rodriguez_freeze_block',
        title: 'ISRU Thermal Melt Well Freeze-Up',
        severity: 'warning',
        description: 'Return line ambient temperature dropped below -40°C. Slush forming in intake manifold.',
        repairAction: 'Engage Auxiliary Resistance Trace Heaters & Boost Flow',
        targetParameter: 'water',
        penaltyRate: 0.9
      }
    ]
  },
  {
    id: 'power_microgrid_module',
    name: 'Fission Surface Power & Microgrid Control',
    code: 'MOD-04 // POWER-CORE',
    category: 'Energy & Distribution',
    primaryParameter: 'power',
    icon: 'zap',
    status: 'nominal',
    summary: 'Distributes electricity from the 10 kWe Stirling Kilopower nuclear reactor, roll-out solar arrays (ROSA), and regenerative fuel cell energy reserves.',
    components: [
      {
        name: '10 kWe Kilopower Nuclear Reactor Link',
        tag: 'KRUSTY-10',
        type: 'Enriched U-235 Core with Sodium Heat Pipes & Stirling Engines',
        specs: 'Continuous Thermal: 40 kWth, Electric Output: 10 kWe',
        health: 99,
        description: 'Base-load power source immune to Martian night cycles, dust storms, and latitude limitations.'
      },
      {
        name: 'Roll-Out Solar Array (ROSA) Telemetry',
        tag: 'ROSA-ARRAY',
        type: 'Gallium Arsenide Triple-Junction PV with Electrostatic Cleaners',
        specs: 'Nominal peak: 18 kWe, Dust repulsion efficiency: 88%',
        health: 92,
        description: 'Flexible roll-out photovoltaic wings equipped with high-voltage AC dust-clearing electrodes.'
      },
      {
        name: 'Regenerative Fuel Cell Bank (RFC)',
        tag: 'RFC-500',
        type: 'Bidirectional Solid Oxide Cell (H2/O2 Energy Storage)',
        specs: 'Capacity: 120 kWh, Discharge round-trip efficiency: 72%',
        health: 97,
        description: 'Stores surplus daytime solar power as compressed hydrogen/oxygen, converting back during peak demand.'
      },
      {
        name: 'Solid-State Power Distribution Unit (SS-PDU)',
        tag: 'PDU-GRID',
        type: 'Gallium Nitride Solid-State Circuit Breakers & Inverters',
        specs: 'Bus Voltage: 120V DC, Automatic load-shedding response: 4ms',
        health: 98,
        description: 'Balances electrical loads across all habitat modules, automatically isolating short circuits.'
      }
    ],
    possibleFailures: [
      {
        id: 'inverter_phase_trip',
        title: 'Primary Inverter Phase Desynchronization',
        severity: 'critical',
        description: 'Voltage oscillation between solar microgrid and Kilopower bus. Power distribution efficiency degraded by 30%.',
        repairAction: 'Re-sync Phase Angle & Reset Solid-State Bus Coupler',
        targetParameter: 'power',
        penaltyRate: 1.6
      },
      {
        id: 'solar_electrostatic_fault',
        title: 'ROSA Dust-Repulsion Electrode Fault',
        severity: 'warning',
        description: 'High-voltage dust-clearing grid open circuit. Fine iron-oxide dust settling on PV panel glass.',
        repairAction: 'Reroute High-Voltage Circuit & Trigger Acoustic Sweeper',
        targetParameter: 'power',
        penaltyRate: 0.9
      }
    ]
  },
  {
    id: 'airlock_module',
    name: 'EVA Preparation, Suit Bay & Dual Airlock',
    code: 'MOD-05 // AIRLOCK-EVA',
    category: 'Surface Operations',
    primaryParameter: 'oxygen',
    icon: 'door-closed',
    status: 'nominal',
    summary: 'Dual-chamber hyperbaric airlock and suit maintenance bay featuring SuitPort rear-entry bulkheads to isolate hazardous Martian perchlorate dust.',
    components: [
      {
        name: 'SuitPort Bulkhead Docking Bays',
        tag: 'SPORT-01..04',
        type: 'Rear-Entry Planetary Exploration Suit Docks',
        specs: 'Atmosphere loss per ingress: < 0.2 m³, Dust infiltration: 0%',
        health: 100,
        description: 'Astronauts enter spacesuits through rear hatches mounted to the habitat exterior, keeping suits outside.'
      },
      {
        name: 'Hyperbaric Chamber Equalization Pumps',
        tag: 'PUMP-EQ4',
        type: 'Variable-Displacement Dual Stage Vacuum Pump',
        specs: 'Depressurization time: 4.5 min, 99.2% gas reclaimed to cabin',
        health: 96,
        description: 'Rapidly cycles airlock chamber pressure between Mars ambient (0.6 kPa) and habitat interior (101.3 kPa).'
      },
      {
        name: 'Electrostatic Dust Mitigation Chamber',
        tag: 'DUST-MIT',
        type: 'Electron-Beam Neutralizer & Magnetic Filtration Vacuum',
        specs: 'Removes toxic perchlorates and sub-micron sharp basalt dust',
        health: 95,
        description: 'Neutralizes electrostatic charges on equipment brought in from Martian surface exploration.'
      }
    ],
    possibleFailures: [
      {
        id: 'airlock_seal_microleak',
        title: 'Airlock Outer Hatch Pressure Seal Micro-Leak',
        severity: 'critical',
        description: 'Basalt grit wedged in silicone hatch gasket. Slow depressurization venting 0.35 kPa/min to Martian atmosphere.',
        repairAction: 'Deploy Thermal Seal Scraper & Re-pressurize Inflatable Gasket',
        targetParameter: 'oxygen',
        penaltyRate: 1.3
      }
    ]
  },
  {
    id: 'command_module',
    name: 'Central Command & Deep Space Comms Array',
    code: 'MOD-06 // COMMAND-OPS',
    category: 'Operations & Comms',
    primaryParameter: 'power',
    icon: 'radio',
    status: 'nominal',
    summary: 'Habitat operational nexus. Manages autonomous habitat diagnostics, Mars orbital relay links, speed-of-light comms delay buffer, and rover teleoperations.',
    components: [
      {
        name: 'Deep Space Network (DSN) Transceiver',
        tag: 'DSN-XBAND',
        type: 'Steerable High-Gain X/Ka-Band Phased Array Antenna',
        specs: 'Downlink: 25 Mbps, One-way speed-of-light delay: 3-22 mins',
        health: 98,
        description: 'Maintains encrypted communication link with Earth Mission Control via Mars Odyssey & TGO relays.'
      },
      {
        name: 'Habitat Master Telemetry Computer',
        tag: 'HAL-MARS',
        type: 'Fault-Tolerant Triple-Modular Redundant (TMR) Core',
        specs: '10,000 real-time telemetry sensors, automated fault triage',
        health: 100,
        description: 'Monitors all base parameters, atmospheric sensors, and power routing 24/7 with autonomous backup.'
      },
      {
        name: 'Surface Rover Teleoperation Rig',
        tag: 'ROV-PILOT',
        type: 'Dual-Seat Low-Latency Telepresence Cockpit',
        specs: 'Controls Pressurized Rover 1 and autonomous science drones',
        health: 96,
        description: 'Allows crew to pilot robotic scouts to remote craters and sample collection sites in real time.'
      }
    ],
    possibleFailures: [
      {
        id: 'telemetry_bus_crash',
        title: 'Sub-Bus B Sensor Concentrator Desync',
        severity: 'warning',
        description: 'Telemetry packet drops from hydroponics and water modules. Automated control systems running on open loop.',
        repairAction: 'Re-flash Controller Firmware & Cold-Restart Bus B',
        targetParameter: 'power',
        penaltyRate: 0.6
      }
    ]
  },
  {
    id: 'habitation_module',
    name: 'Crew Quarters, Medical Infirmary & Gym',
    code: 'MOD-07 // CREW-HAB',
    category: 'Habitation & Health',
    primaryParameter: 'food',
    icon: 'heart-pulse',
    status: 'nominal',
    summary: 'Houses 4 private crew sleep quarters, circadian lighting, medical diagnostic trauma station, and vibration-isolated exercise equipment.',
    components: [
      {
        name: 'Acoustic-Insulated Private Sleep Pods',
        tag: 'POD-A..D',
        type: 'Soundproofed 3D-Printed Bunks with Rad-Shielded Storm Liner',
        specs: 'GCR/SPE radiation storm bunker with water-wall bladder',
        health: 100,
        description: 'Personal quarters giving each astronaut private space, circadian LED lighting, and emergency storm shelter.'
      },
      {
        name: 'Cycle Ergometer & Resistance Trainer (CEVIS/ARED)',
        tag: 'GYM-ARED',
        type: 'Pneumatic Resistance & Vibration-Isolated Ergometer',
        specs: 'Preserves bone density and muscle mass under 0.38g gravity',
        health: 95,
        description: 'Astronauts exercise 2.5 hours daily to counter microgravity bone mineral deconditioning.'
      },
      {
        name: 'Autonomous Medical & Triage Station',
        tag: 'MED-BAY',
        type: 'Point-of-care Blood Lab, Diagnostic Ultrasound & Surgery Rig',
        specs: 'Full autonomous telehealth diagnostic database',
        health: 99,
        description: 'Equipped to handle trauma, respiratory irritation from dust, infection, and psychological wellness.'
      }
    ],
    possibleFailures: [
      {
        id: 'circadian_thermal_loop',
        title: 'Crew Pod Thermal Loop Thermostat Lock',
        severity: 'warning',
        description: 'Heater bypass valve locked in open position. Quarters temperature dropped to 4°C, elevating crew caloric demand.',
        repairAction: 'Manual Bypass Valve Actuation & Calibrate Sensor',
        targetParameter: 'food',
        penaltyRate: 0.7
      }
    ]
  }
];

export const CHALLENGE_TYPES = [
  {
    id: 'standard_survival',
    title: 'Standard Operational Survival',
    badge: 'Recommended',
    tag: '30-DAY ENDURANCE',
    difficulty: 'Moderate',
    difficultyRating: 2,
    icon: 'shield-check',
    briefing: 'Establish steady-state base operations across 30 Martian sols. Manage baseline resource depletion while reacting to routine mechanical wear, ambient thermal swings, and nominal maintenance demands.',
    hazardsFocus: [
      'Day/Night thermal variations (-80°C nights)',
      'Gradual water recycling and crop growth balance',
      'Routine ECLSS filter and desiccant regeneration'
    ],
    parameterPressure: 'Balanced pressure across all 4 base parameters.',
    recommendedStrategy: 'Maintain high storage reserves early. Address minor equipment alerts immediately to prevent compound subsystem cascade failures.'
  },
  {
    id: 'dust_storm_power_crisis',
    title: 'Global Dust Storm & Power Crisis',
    badge: 'High Hazard',
    tag: 'ENERGY & VISIBILITY EMERGENCY',
    difficulty: 'Challenging',
    difficultyRating: 4,
    icon: 'cloud-lightning',
    briefing: 'A planet-encircling dust storm has engulfed the landing sector. Airborne dust particles block up to 98% of direct solar insolation, while abrasive electrostatic dust fouls solar wings and airlock seals.',
    hazardsFocus: [
      'Heavy dust storm blocking solar panels (power down to 25% of baseline)',
      'Severe power rationing required for life support',
      'Increased airlock seal wear from airborne abrasive grit'
    ],
    parameterPressure: 'Extreme pressure on Power, cascading into Oxygen and Water production.',
    recommendedStrategy: 'Rely heavily on the Kilopower reactor and Regenerative Fuel Cells. Shed non-essential loads (e.g. crop growth lamps) during peak storm intensity.'
  },
  {
    id: 'atmospheric_thermal_breach',
    title: 'ECLSS Decompression & Subzero Shock',
    badge: 'High Hazard',
    tag: 'ATMOSPHERIC & THERMAL EMERGENCY',
    difficulty: 'Extreme',
    difficultyRating: 5,
    icon: 'thermometer-snowflake',
    briefing: 'A micrometeorite strike and seismic tremor have damaged the external regolith shield, triggering rapid cabin decompression risks and severe thermal bleeding into the -100°C Martian environment.',
    hazardsFocus: [
      'Subzero temperature drop threatening water line freezing',
      'Rapid atmospheric pressure and oxygen depletion',
      'High heating load threatening microgrid collapse'
    ],
    parameterPressure: 'Critical pressure on Oxygen and Power (heating systems).',
    recommendedStrategy: 'Isolate affected habitat bulkheads immediately. Prioritize CDRA and Sabatier repairs to preserve breathable air volume.'
  },
  {
    id: 'water_scarcity_crop_triage',
    title: 'Hydrologic Failure & Agricultural Triage',
    badge: 'Specialist',
    tag: 'CLOSED-LOOP RESOURCE CRISIS',
    difficulty: 'Challenging',
    difficultyRating: 3,
    icon: 'alert-triangle',
    briefing: 'The primary VCD distillation centrifuge and subsurface ISRU melt pump have suffered catastrophic mineral scaling, halting water recycling and threatening immediate collapse of the aeroponic food crop.',
    hazardsFocus: [
      'Water recovery efficiency dropped from 98% to 35%',
      'Crop desiccation within 48 hours without root misting',
      'High metabolic stress on crew ration reserves'
    ],
    parameterPressure: 'Intense pressure on Water and Food supplies.',
    recommendedStrategy: 'Aggressively clean and descale the water processor assembly while drawing emergency reserve water for critical hydroponic batches.'
  }
];
