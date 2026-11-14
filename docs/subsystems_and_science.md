# Subsystems & Scientific Specifications — Habitat Alpha-1

## 1. Overview
Habitat Alpha-1 is modeled on NASA's CHAPEA (Crew Health and Performance Exploration Analog / Mars Dune Alpha) and Mars Design Reference Architecture 5.0 (DRA 5.0). It incorporates closed-loop Environmental Control and Life Support Systems (ECLSS), In-Situ Resource Utilization (ISRU), and nuclear surface power.

---

## 2. Four Fundamental Base Parameters

| Parameter | Symbol | Starting Baseline (Valles Marineris) | Primary Supporting Subsystems |
|-----------|--------|-------------------------------------|--------------------------------|
| **Oxygen** | 💨 | 80% | OGA PEM Electrolysis, Sabatier Methanation, CDRA Zeolite Scrubber |
| **Food** | 🌱 | 80% | Agri-Pod Bioregenerative Aeroponic Towers, Caloric Rations |
| **Water** | 💧 | 80% | VCD Centrifuge Distillation, Catalytic Oxidation, Subsurface Ice Melt |
| **Power** | ⚡ | 80% | Kilopower KRUSTY 10 kWe Nuclear Reactor, Photovoltaic Arrays |

---

## 3. Habitat Subsystem Modules

### 3.1 Command Operations Deck (`command_module`)
* **Primary Function:** Mission control communications, orbital satellite relay, habitat atmospheric telemetry monitoring, and challenge briefing.
* **Key Components:**
  - High-bandwidth deep-space laser comms array.
  - Multi-terminal flight controller console and holographic HUD displays.
  - Primary habitat environmental management mainframe.

### 3.2 Atmospheric Processing Hub (`eclss_module`)
* **Primary Function:** Continuous air revival, CO2 scrubbing, and O2 replenishment.
* **Key Components:**
  - **Oxygen Generation Assembly (OGA):** Solid polymer electrolysis (SPE) splitting water into breathable O2 and hydrogen.
  - **Carbon Dioxide Removal Assembly (CDRA):** Thermal swing adsorption using 13X zeolite desiccants to extract metabolic CO2.
  - **Sabatier Methanation Reactor:** Combines waste CO2 with OGA byproduct hydrogen over a ruthenium catalyst at 400°C to generate water ($CH_4 + 2H_2O$), recycling up to 50% of oxygen.

### 3.3 Bioregenerative Agri-Pod Farm (`hydroponics_module`)
* **Primary Function:** Crew supplemental nutrition, mental well-being, and biological air revitalisation.
* **Key Components:**
  - **Vertical Aeroponic Rotating Towers:** High-density crop racks suspended in nutrient mist, reducing water consumption by 95% compared to soil farming.
  - **Narrow-Spectrum LED Luminaire Racks:** Targeted 660nm deep red and 450nm blue photosynthetically active radiation (PAR).
  - Microgreens, dwarf wheat, sweet potato, and spirulina algae photobioreactors.

### 3.4 Water Recovery & Centrifuge Assembly (`water_recovery_module`)
* **Primary Function:** Graywater purification, urine recovery, and humidity condensate recycling (>98% loop closure).
* **Key Components:**
  - **Vapor Compression Distillation (VCD) Centrifuge:** Low-pressure rotational boiler separating clean distillate from brine under 0.38g.
  - **Multifiltration Beds & Catalytic Oxidation Reactor:** Eliminates volatile organic compounds (VOCs).
  - Subsurface ice extraction core processor for local ISRU makeup water.

### 3.5 Fission Surface Power Microgrid (`power_microgrid_module`)
* **Primary Function:** Continuous, dust-storm-independent base electrical power.
* **Key Components:**
  - **Kilopower KRUSTY Reactor:** Enriched uranium-molybdenum core paired with sodium heat pipes and Stirling engines producing 10 kWe base-load.
  - Autonomous solid-state DC microgrid switchgear with Li-ion buffer battery banks.
  - Tracking solar photovoltaic arrays providing peak daytime supplementary power.

### 3.6 EVA Preparation & SuitPort Airlock (`airlock_module`)
* **Primary Function:** Extravehicular Activity ingress/egress, spacesuit servicing, and dust mitigation.
* **Key Components:**
  - **Rear-Entry SuitPort Bulkheads:** Spacesuits remain mounted outside the habitat living space, preventing toxic perchlorate and abrasive basalt dust from contaminating the living quarters.
  - Electrostatic dust removal vacuum chamber.
  - Hyperbaric two-chamber airlock with 5-stage automated pressure equalization.

### 3.7 Crew Quarters & Medical Bay (`habitation_module`)
* **Primary Function:** Crew berthing pods, physiological monitoring, circadian lighting, and medical triage.
* **Key Components:**
  - Sound-dampened sleep pods with personalized ventilation ducting.
  - Exercise cycle ergometer and resistive exercise device (ARED) for muscle and bone preservation in 0.38g.
  - Telemedicine diagnostic imaging suite and pharmacy locker.

---

## 4. Martian Landing Sites

| Site | Geological Context | Starting Parameter Profile |
|------|--------------------|---------------------------|
| **Valles Marineris** | Canyon floor (7 km deep), natural canyon wall radiation shielding, dense 0.95 kPa atmosphere. | Balanced baseline (Oxygen: 80%, Food: 80%, Water: 80%, Power: 80%). |
| **North Polar Cap** | Glacial ice sheets (Planum Boreum). Rich water ice deposits, low solar angle, intense seasonal cold. | High Water (95%), Low Power (60%), Oxygen (85%), Food (70%). |
| **Olympus Mons** | High-altitude shield volcano slope. Maximum solar irradiance, thin 0.30 kPa atmosphere, dry soil. | High Power (95%), Low Oxygen (65%), Low Water (60%), Food (75%). |
| **Hellas Basin** | Deep impact crater basin (8 km below datum). Highest atmospheric pressure (1.24 kPa) and O2 generation efficiency. | High Oxygen (95%), Low Power (65%), Food (80%), Water (75%). |

---

## 5. Mission Challenge Scenarios (Randomized Allocation)

1. **Standard Survival:** Nominal 30-sol expedition verifying long-duration life support loop closures.
2. **Global Dust Storm & Power Crisis:** Massive airborne dust reduces solar irradiance by 85%, stressing battery banks and triggering electrical blackouts.
3. **ECLSS Atmospheric Decompression:** Micrometeorite impact compromises pressure hull; OGA electrolyzer and air-scrubbing loops operate at critical deficits.
4. **Hydrologic Failure & Agricultural Triage:** Centrifuge failure halts water recycling; crop beds in the Agri-Pod face rapid wilting without immediate intervention.
