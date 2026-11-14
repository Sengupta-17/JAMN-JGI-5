# Subsystems & Scientific Architecture (NASA BVAD Rev. 2 Baseline)

## 1. Overview
The simulation models life support and resource dynamics for a **four-person crew** over **30 Martian sols**, calibrated against NASA's Baseline Values and Assumptions Document (BVAD Rev. 2, February 2022) and CHAPEA mission analogue parameters.

---

## 2. Reserve Definitions & Baseline Quantities

| Parameter | 100% Capacity | Physical Unit | Daily 4-Crew Flow | Scientific Basis |
|---|---:|---:|---:|---|
| **Oxygen** | 12 sols metabolic reserve | $42.96\text{ kg O}_2$ ($1\text{ pp} = 0.430\text{ kg}$) | $3.58\text{ kg/sol}$ ($8.333\text{ pp/sol}$) | NASA BVAD Rev. 2 Table 3-31 ($0.895\text{ kg/person/sol}$). |
| **Food** | 45 sols dry food solids | $144.0\text{ kg}$ ($1\text{ pp} = 1.440\text{ kg}$) | $3.20\text{ kg/sol}$ ($2.222\text{ pp/sol}$) | NASA BVAD Rev. 2 Table 3-31 ($0.800\text{ kg/person/sol}$). |
| **Water** | 20 sols net make-up water | $21.504\text{ kg}$ ($1\text{ pp} = 0.215\text{ kg}$) | $1.075\text{ kg/sol}$ ($5.000\text{ pp/sol}$) | BVAD Early Planetary Base ($4.48\text{ kg/CM-sol}$) with $94\%$ recovery loop. |
| **Power** | 5 sols nominal load | $2,400\text{ kWh}$ ($1\text{ pp} = 24.0\text{ kWh}$) | $480\text{ kWh/sol}$ ($20.00\text{ pp/sol}$) | $20\text{ kWe}$ continuous habitat base load study. |

---

## 3. Mathematical Resource Equations

### 3.1 Oxygen Rate
$$\Delta\text{Oxygen} = D_O \cdot (\text{OGA\_fraction} - \text{activityFactor}) - \text{leakBase} - \text{leakEvent}$$
* $D_O = 8.333\text{ pp/sol}$.
* $\text{OGA\_fraction} = h_{\text{eclss}} \cdot \sigma_E(\text{Power}) \cdot \min(1, \text{Water}/15) \cdot \text{eclssModeFactor}$.
* $\text{leakBase} = 0.125 \cdot [1 + 6\cdot(1 - h_{\text{airlock}})] \cdot (\text{habitatPressureKPa} / 56.5)$.
* $\text{leakEvent} = 2.50\text{ pp/sol}$ during an active hatch seal rupture ($0.625\text{ pp/sol}$ if bulkhead isolated).

### 3.2 Water Rate
$$\Delta\text{Water} = \text{waterGain} - \text{waterLoss}$$
* $\text{waterLoss} = D_W \cdot r_w \cdot \text{activityFactor} \cdot \left(\frac{1 - \eta_{\text{effective}}}{0.06}\right)$.
* $\text{waterGain} = (2.00 + 1.50\sqrt{i_{\text{site}}}) \cdot h_{\text{water}} \cdot \text{isruWater}$.
* At baseline $94\%$ recovery ($\eta_{\text{effective}} = 0.94$), make-up loss equals $5.00\text{ pp/sol}$.
* Under the high-recovery Brine Processor cycle ($\eta_{\text{effective}} = 0.98$), make-up loss drops to $1.67\text{ pp/sol}$, yielding a net positive accumulation at all landing sites.

### 3.3 Food Rate
$$\Delta\text{Food} = \text{cropCredit} - (D_F \cdot r_f \cdot \text{activityFactor})$$
* $D_F = 2.222\text{ pp/sol}$.
* $\text{cropCredit} = D_F \cdot 0.22 \cdot h_{\text{hydro}} \cdot \text{tend} \cdot \text{lights} \cdot \text{coldCropMultiplier}$.
* $0.22$ represents the maximum caloric offset provided by the $40\text{ m}^2$ habitat aeroponic grow bay against a $180\text{ m}^2$ full-diet requirement.

### 3.4 Power Rate
$$\Delta\text{Power} = 20 \cdot (\text{generationRatio} - \text{loadRatio})$$
* $\text{generationRatio} = 0.50\cdot h_{\text{reactor}} + 0.60\cdot s_{\text{site}}\cdot(1 - \text{arraySoiling})\cdot T_\tau\cdot h_{\text{inverter}}$.
* $T_\tau = \exp(-0.45\cdot\max(0, \tau - 0.5))$, clamped between $0.01$ and $1.00$.
* $\text{loadRatio} = \text{effectiveBaseLoad} + \text{heatingLoad} + \text{repressurisationLoad} + \text{exerciseLoad} + \text{shelterLoad}$.

---

## 4. Power Load Shedding & Cross-Coupling (§2.4)

| Power Buffer | Operating State | Subsystem Consequences |
|---:|---|---|
| **$\ge 40\%$** | Nominal | Full crop lighting, extraction, and nominal ECLSS capacity. Base load: $0.80$. |
| **$25\text{--}40\%$** | Partial Load Shedding | Crop lights and water extraction halved ($50\%$). Base load cap falls to $0.74$. |
| **$10\text{--}25\%$** | Severe Conservation | Crop lights and water extraction OFF. ECLSS factor $\sigma_E(P)$ derates linearly from $1.0$ to $0.8$. Water recovery trends to $90\%$. Heating load halved. Base load cap: $0.60$. |
| **$< 10\%$** | Emergency Life Support | Essential life support only. $\sigma_E(P)$ derates from $0.8$ to $0$. Heating at $25\%$. Base load cap: $0.50$. |
| **$0\%$** | Electrical Blackout | Total grid blackout. Mission terminates in failure if unrecovered before sol end. |

---

## 5. Site Modifiers & Clear-Sky Performance

| Site ID | Site Name | Pressure | $s_{\text{site}}$ | $i_{\text{site}}$ | $\theta$ | Storm Exp. | Soiling | Clear-Sky Power | Clear-Sky Water |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `north_polar` | North Polar Ice Cap | $0.80\text{ kPa}$ | $0.85$ | $3.00$ | $1.60$ | $0.80$ | $0.10$ | $-0.22\text{ pp/sol}$ | $-0.40\text{ pp/sol}$ |
| `olympus_mons` | Olympus Mons | $0.15\text{ kPa}$ | $1.15$ | $0.25$ | $1.10$ | $0.30$ | $0.02$ | $+5.12\text{ pp/sol}$ | $-2.25\text{ pp/sol}$ |
| `valles_marineris`| Valles Marineris | $1.20\text{ kPa}$ | $0.95$ | $1.20$ | $0.90$ | $1.00$ | $0.15$ | $+1.69\text{ pp/sol}$ | $-1.36\text{ pp/sol}$ |
| `hellas_basin` | Hellas Basin | $1.24\text{ kPa}$ | $0.90$ | $1.00$ | $0.85$ | $1.30$ | $0.30$ | $-0.35\text{ pp/sol}$ | $-1.50\text{ pp/sol}$ |

---

## 6. Crew Economy & Conditioning Debt

* **Daily Allocation:** 20 discretionary Crew-Hours (CH) per sol for the four-person team.
* **Exercise Prescription:** $1.2\text{ hours/person/sol}$ ($5\text{ CH}$ block). Routine exercise is already accounted for in BVAD metabolic baseline rates and does not impose a secondary food/water penalty.
* **Conditioning Debt:** Skipping exercise increments hidden debt by $+1\text{ pt/sol}$. Every 3 debt points reduces daily available CH by $1\text{ CH}$ (max $-4\text{ CH}$), and increases external EVA repair costs by $+1\text{ CH}$ ($\ge 3\text{ pts}$) or $+2\text{ CH}$ ($\ge 6\text{ pts}$).
* **Radiation Dose:** Curiosity RAD baseline ($0.66\text{ mSv/sol}\times\text{doseFactor}$). Solar Particle Events cap discretionary CH at $7\text{ CH}$ and require habitat storm shelter lockdown.
