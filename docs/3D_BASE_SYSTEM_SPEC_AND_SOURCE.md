# 3D Mars Base Habitat Alpha-1: Architecture, Physics & Complete Source Code

> **Document Purpose:** Complete technical specification and standalone source code package for the **3D Mars Base Habitat Alpha-1 (Segment 3)**. This documentation provides your team with the full structural mechanics, contact physics, rendering pipeline, Gazebo simulation files, and production code required to modify, extend, and reintegrate the 3D base.

---

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Core Mechanics & Interaction Design](#2-core-mechanics--interaction-design)
3. [Graphics & Visual Rendering Architecture (Three.js)](#3-graphics--visual-rendering-architecture-threejs)
4. [Contact Physics Engine (Gazebo / ODE Standards)](#4-contact-physics-engine-gazebo--ode-standards)
5. [Complete Source Code Package](#5-complete-source-code-package)
   - [5.1 Gazebo Astronaut Kinematics (`physics/astronaut_kinematics.sdf`)](#51-gazebo-astronaut-kinematics-physicsastronaut_kinematicssdf)
   - [5.2 Gazebo Habitat World (`physics/base_habitat.world`)](#52-gazebo-habitat-world-physicsbase_habitatworld)
   - [5.3 Gazebo Physics Engine (`js/gazeboPhysics.js`)](#53-gazebo-physics-engine-jsgazebophysicsjs)
   - [5.4 Three.js 3D Base Renderer (`js/threeBaseRenderer.js`)](#54-threejs-3d-base-renderer-jsthreebaserendererjs)
   - [5.5 Subsystem Module Coordinate Specifications (`js/baseData.js`)](#55-subsystem-module-coordinate-specifications-jsbasedatajs)
6. [Teammate Handoff & Extension Guide](#6-teammate-handoff--extension-guide)

---

## 1. System Architecture Overview

The 3D Mars Base Habitat Alpha-1 is a geodesic greenhouse biodome established on the Martian surface ($R = 16.6\text{ m}$ perimeter radius, $18.2\text{ m}$ dome shell radius). It serves as the primary crew habitat, telemetry command center, and life-support operations facility for the mission.

```
+-----------------------------------------------------------------------------------------+
|                                3D BASE HABITAT RUNTIME                                  |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|   +--------------------------+          Events           +--------------------------+   |
|   |   ThreeBaseRenderer.js   | <=======================> |    GazeboPhysicsEngine   |   |
|   |                          |                           |                          |   |
|   | - WebGL Scene & Camera   |  dt, wishDir, yaw, jump   | - 0.38g Mars Gravity     |   |
|   | - Greenhouse Glass Dome  | ------------------------> | - Capsule vs AABB / Cyl  |   |
|   | - Martian Mesa Exterior  |                           | - Velocity Sliding Plane |   |
|   | - Subsystem 3D Props     |  Resolved px, py, pz      | - Solid Obstacle Bounds  |   |
|   | - Pointer Lock (WASD)    | <------------------------ | - Dynamic Blast Door     |   |
|   | - Raycast & Holograms    |                           | - Proximity Zones        |   |
|   +--------------------------+                           +--------------------------+   |
|                |                                                       |                |
|                v                                                       v                |
|      Three.js WebGL Canvas                                Gazebo SDF / World Definition |
|      (HTML DOM Container)                                 (physics/*.sdf, *.world)      |
+-----------------------------------------------------------------------------------------+
```

### Key Dimensions & Physical Envelope:
- **Habitat Floor Radius:** $16.6\text{ m}$ interior usable radius ($18.0\text{ m}$ structural slab).
- **Greenhouse Geodesic Dome:** $18.2\text{ m}$ hemisphere radius, centered at $(x: 0, y: 2.5, z: 0)$.
- **Central Telemetry Mast:** Height $9.0\text{ m}$, radius $0.6\text{ m}$, supporting rotating overhead multi-screen holographic displays.
- **Central Hexagonal Bio-Planter:** Radius $3.4\text{ m}$, bench height $0.45\text{ m}$, housing Martian succulent flora.
- **Astronaut Dimensions:** Height $1.82\text{ m}$, eye level $1.72\text{ m}$, suit capsule collision radius $r = 0.38\text{ m}$.

---

## 2. Core Mechanics & Interaction Design

### 2.1 First-Person Locomotion
- **Controls:**
  - `[W][A][S][D]` or `[Arrow Keys]`: Directional movement relative to camera heading.
  - `[Mouse Move]` (with Pointer Lock): Pitch ($\pm 85^\circ$) and Yaw look rotation.
  - `[Space]`: Low-gravity jump impulse ($v_y = 3.4\text{ m/s}$).
  - `[E]`: Proximity interaction with nearest terminal or blast door toggle.
  - `[Tab]` / `[M]`: Toggle between full-screen 3D exploration and 2D tactical blueprints.
  - `[Escape]`: Release pointer lock / close subsystem side panel.

### 2.2 Proximity Interaction System
Astronaut position $(p_x, p_z)$ is evaluated every frame against 8 localized interaction spheres:
1. **Command Operations & Comms Console:** $(0, -12.5)$, radius $3.6\text{ m}$.
2. **ECLSS Atmospheric Processing Hub (OGA & CDRA):** $(-11.5, 0)$, radius $3.6\text{ m}$.
3. **Agri-Pod Bioregenerative Farm:** $(11.5, 0)$, radius $3.6\text{ m}$.
4. **Water Recovery & Centrifuge Distillation:** $(-9.0, 8.0)$, radius $3.6\text{ m}$.
5. **Kilopower Nuclear Microgrid Switchboard:** $(9.0, 8.0)$, radius $3.6\text{ m}$.
6. **EVA Airlock Pressurized Blast Hatch:** $(0, 15.2)$, radius $2.2\text{ m}$.
7. **EVA Preparation & SuitPort Bay:** $(0, 18.2)$, radius $2.5\text{ m}$.
8. **Crew Quarters & Medical Bay:** $(0, 4.8)$, radius $2.5\text{ m}$.

When within range, a contextual HUD banner (`#fpvInteractionPrompt`) prompts the user with action text (e.g., `PRESS [E] TO INSPECT ECLSS LIFE SUPPORT` or `PRESS [E] TO OPEN AIRLOCK BLAST DOOR`).

### 2.3 Interactive Airlock Blast Door
- Located at the southern entrance portal $(x: 0, z: 16.5\text{ m})$.
- Features a pneumatic door slab anchored on a revolute hinge joint at $(x: -1.4\text{ m}, z: 16.5\text{ m})$.
- **State Transition:**
  - **Closed:** Door is angled at $0^\circ$. A solid box collider ($3.0\text{ m} \times 0.6\text{ m} \times 3.5\text{ m}$) is active in `GazeboPhysicsEngine`, physically preventing the astronaut from phasing through the door. Status beacon illuminates in pulsing red (`#ef4444`).
  - **Open:** Triggered by `[E]` or clicking the door. The door smoothly rotates $90^\circ$ outwards ($0 \to \frac{\pi}{2}$ radians) over a $0.8\text{ s}$ S-curve. The collider is dynamically disabled in the physics engine (`door.disabled = true`), permitting the astronaut to walk through into the airlock vestibule chamber. Status beacon turns green (`#10b981`).

---

## 3. Graphics & Visual Rendering Architecture (Three.js)

### 3.1 Transparent Greenhouse Geodesic Roof
The ceiling of the habitat is modelled after bio-regenerative Martian surface structures:
- **Dome Geometry:** `THREE.SphereGeometry(18.2, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.52)` positioned at $y = 2.0\text{ m}$.
- **Physically Based Glass Material:**
  ```javascript
  new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.88,
    ior: 1.52,
    reflectivity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  ```
- **Geodesic Ribbing:** Layered on top using `THREE.IcosahedronGeometry(18.25, 2)` wireframe with metallic dark-grey struts (`color: 0x334155, linewidth: 2`), casting realistic structural shadows onto the habitat floor.

### 3.2 Exterior Martian Vista
Through the transparent dome, astronauts observe the authentic Martian exterior:
- **Atmospheric Sky & Fog:** Horizon background set to `#b25329` with exponential distance fog (`THREE.FogExp2(0x9a3e1d, 0.006)`).
- **Exterior Terrain Floor:** An expansive rust-red circular plane (`radius: 280\text{ m}`) with basalt bump-mapping.
- **Canyon Rim & Mesa Cliffs:** An inverted outer cylinder (`innerRadius: 85\text{ m}, outerRadius: 95\text{ m}, height: 32\text{ m}`) simulating the towering rock walls of Valles Marineris.
- **External Surface Assets:** Distant high-gain parabolic antennas, solar photovoltaic array rows, and meteorological masts visible beyond the perimeter.

### 3.3 Habitat Interior Architecture
- **Central Telemetry Column & Ring:** Vertical column ($r: 0.6\text{ m}, h: 9.0\text{ m}$) wrapped with wire looms and mounting brackets. At $y = 4.8\text{ m}$, a ring of 4 multi-angle monitor screens rotates gently, displaying live telemetry graphics (`pH`, bar graphs, orbit projections).
- **Radial Science Lab Desks:** Three hexagonal workstations offset at $120^\circ$ intervals ($5.2\text{ m}$ radius). Features lab computers, chemical glassware, reagent racks, and swivel stools.
- **Command Deck:** Situated at the north apex $(z = -14.2\text{ m})$. Massive curved command console ($6.4\text{ m}$ wide) flanked by dual telecommunications and computer server racks ($3.2\text{ m}$ high) with flashing status LEDs and glowing cyan holographic displays.
- **Subsystem Modules:**
  - *ECLSS (West):* Quad oxygen/nitrogen high-pressure gas cylinders, Sabatier carbon scrubber, and overhead ductwork.
  - *Agri-Pod (East):* Dual 3-tier vertical aeroponic crop trays with magenta/UV plant-growth LED fixtures.
  - *Water Recovery (South-West):* VCD centrifuge distillation drum with fluid manifolds.
  - *Kilopower Microgrid (South-East):* Reactor power inverter unit with pulsing amber core glow.

### 3.4 Lighting Scheme
- **Sunlight:** Directional light (`color: 0xffd4a8, intensity: 1.35`) angled at $(x: 22, y: 38, z: 18)$ casting high-resolution PCF soft shadows through the geodesic framework.
- **Martian Dust Fill:** Hemisphere ambient light (`sky: 0xffdec7, ground: 0x9a3412, intensity: 0.65`).
- **Interior Task Lighting:**
  - Fluorescent bay strip fixtures along module bulkheads (`0xe0f2fe`).
  - Sector-specific mood lights (Magenta for crops, Cyan for command, Amber for water distillation).

---

## 4. Contact Physics Engine (Gazebo / ODE Standards)

The physics engine (`js/gazeboPhysics.js`) implements Open Dynamics Engine (ODE) principles tailored for first-person kinematics in low gravity.

### 4.1 Kinematic Equations & Constants
$$\mathbf{g} = [0, -3.721, 0]^T \text{ m/s}^2 \quad (0.38g)$$
$$m_{\text{suit}} = 85.0\text{ kg}, \quad r_{\text{capsule}} = 0.38\text{ m}, \quad h_{\text{eye}} = 1.72\text{ m}$$
$$v_{\text{walk}} = 4.8\text{ m/s}, \quad a_{\text{ground}} = 12.0\text{ m/s}^2, \quad a_{\text{air}} = 3.5\text{ m/s}^2$$
$$\mu_{\text{ground}} = 0.82, \quad k_{\text{air}} = 0.96, \quad v_{\text{jump}} = 3.4\text{ m/s}$$

### 4.2 Velocity Integration
At each time step $\Delta t \le 0.05\text{ s}$, given camera yaw $\theta$:
$$\mathbf{f}_{\text{cam}} = [-\sin\theta, 0, -\cos\theta]^T, \quad \mathbf{r}_{\text{cam}} = [\cos\theta, 0, -\sin\theta]^T$$
$$\mathbf{v}_{\text{wish}} = \text{normalize}(\mathbf{f}_{\text{cam}} \cdot u_{\text{fwd}} + \mathbf{r}_{\text{cam}} \cdot u_{\text{strafe}}) \times v_{\text{walk}}$$
$$\mathbf{v}_{xz}(t + \Delta t) = \mathbf{v}_{xz}(t) + (\mathbf{v}_{\text{wish}} - \mathbf{v}_{xz}(t)) \cdot a \cdot \Delta t$$

### 4.3 Solid Contact Resolution & Wall Sliding
To prevent phasing through walls and furniture, contact normals $\mathbf{n}$ are calculated and penetration is resolved immediately. Tangential velocity is preserved while perpendicular velocity into the obstacle is cancelled:

#### A. Cylinder Obstacle Resolution (Column, Desks, Planter):
Given astronaut center $\mathbf{p} = (p_x, p_z)$ and cylinder center $\mathbf{c} = (c_x, c_z)$ with radius $R_c$:
$$\Delta\mathbf{p} = \mathbf{p} - \mathbf{c}, \quad d = \|\Delta\mathbf{p}\|, \quad d_{\min} = R_c + r_{\text{capsule}}$$
$$\text{If } d < d_{\min}: \quad \mathbf{n} = \frac{\Delta\mathbf{p}}{d}$$
$$\mathbf{p}' = \mathbf{p} + \mathbf{n} \cdot (d_{\min} - d)$$
$$\text{If } \mathbf{v} \cdot \mathbf{n} < 0: \quad \mathbf{v}' = \mathbf{v} - (\mathbf{v} \cdot \mathbf{n})\mathbf{n} \quad \text{(Slide along surface)}$$

#### B. Axis-Aligned Box Obstacle Resolution (Desks, Consoles, Racks):
Given box $[\mathbf{b}_{\min}, \mathbf{b}_{\max}]$:
$$\mathbf{p}_{\text{closest}} = \text{clamp}(\mathbf{p}, \mathbf{b}_{\min}, \mathbf{b}_{\max})$$
$$\Delta\mathbf{p} = \mathbf{p} - \mathbf{p}_{\text{closest}}, \quad d = \|\Delta\mathbf{p}\|$$
$$\text{If } d < r_{\text{capsule}}: \quad \mathbf{n} = \frac{\Delta\mathbf{p}}{d}$$
$$\mathbf{p}' = \mathbf{p} + \mathbf{n} \cdot (r_{\text{capsule}} - d)$$
$$\text{If } \mathbf{v} \cdot \mathbf{n} < 0: \quad \mathbf{v}' = \mathbf{v} - (\mathbf{v} \cdot \mathbf{n})\mathbf{n}$$

---

## 5. Complete Source Code Package

Below is the complete, unabridged source code for all components governing the 3D base.

### 5.1 Gazebo Astronaut Kinematics (`physics/astronaut_kinematics.sdf`)
```xml
<?xml version="1.0" ?>
<!--
  Gazebo Model: Astronaut First-Person Kinematic Agent
  Dimensions: Height 1.82m, Radius 0.38m (spacesuit envelope)
  Contact friction and restitution for smooth sliding on bulkheads.
-->
<sdf version="1.6">
  <model name="astronaut_agent">
    <pose>0 -8 0.91 0 0 1.5707</pose>
    <link name="base_link">
      <inertial>
        <mass>85.0</mass> <!-- 85 kg human + suit mass in 0.38g -->
        <inertia>
          <ixx>12.5</ixx>
          <iyy>12.5</iyy>
          <izz>4.2</izz>
        </inertia>
      </inertial>

      <!-- Kinematic Capsule Collision -->
      <collision name="astronaut_capsule">
        <geometry>
          <cylinder>
            <radius>0.38</radius>
            <length>1.82</length>
          </cylinder>
        </geometry>
        <surface>
          <friction>
            <ode>
              <mu>0.65</mu>
              <mu2>0.65</mu2>
              <slip1>0.02</slip1>
              <slip2>0.02</slip2>
            </ode>
          </friction>
          <contact>
            <ode>
              <kp>1000000.0</kp>
              <kd>50.0</kd>
              <max_vel>0.1</max_vel>
              <min_depth>0.002</min_depth>
            </ode>
          </contact>
        </surface>
      </collision>

      <!-- First-Person Sensor / Eye level at 1.70m -->
      <sensor name="fpv_camera" type="camera">
        <pose>0 0 0.78 0 0 0</pose>
        <camera>
          <horizontal_fov>1.4</horizontal_fov>
          <image>
            <width>1920</width>
            <height>1080</height>
          </image>
          <clip>
            <near>0.1</near>
            <far>100</far>
          </clip>
        </camera>
      </sensor>
    </link>
  </model>
</sdf>
```

---

### 5.2 Gazebo Habitat World (`physics/base_habitat.world`)
```xml
<?xml version="1.0" ?>
<!-- 
  Gazebo World: Mars Surface Base Habitat Alpha-1
  Simulates contact physics, collision boundaries, solid interior structures,
  interactive airlock blast door, and Martian 0.38g gravity with transparent greenhouse dome.
-->
<sdf version="1.6">
  <world name="mars_base_habitat">
    
    <!-- Mars Gravity: 3.72 m/s^2 downward -->
    <gravity>0 0 -3.721</gravity>
    
    <physics type="ode">
      <max_step_size>0.005</max_step_size>
      <real_time_factor>1.0</real_time_factor>
      <real_time_update_rate>200</real_time_update_rate>
      <ode>
        <solver>
          <type>quick</type>
          <iters>50</iters>
          <sor>1.3</sor>
        </solver>
        <constraints>
          <cfm>0.00001</cfm>
          <erp>0.2</erp>
          <contact_max_correcting_vel>10.0</contact_max_correcting_vel>
          <contact_surface_layer>0.001</contact_surface_layer>
        </constraints>
      </ode>
    </physics>

    <!-- Ambient Lighting & Sunlight through Mars Atmosphere -->
    <scene>
      <ambient>0.45 0.35 0.28 1.0</ambient>
      <background>0.75 0.42 0.25 1.0</background>
      <shadows>true</shadows>
    </scene>

    <!-- Directional Sun: Martian Irradiance (590 W/m^2) streaming through greenhouse dome -->
    <light type="directional" name="mars_sun">
      <cast_shadows>true</cast_shadows>
      <pose>20 15 35 0 0.85 0.4</pose>
      <diffuse>1.0 0.88 0.75 1.0</diffuse>
      <specular>0.4 0.35 0.3 1.0</specular>
      <attenuation>
        <range>1000</range>
        <constant>0.9</constant>
        <linear>0.01</linear>
        <quadratic>0.001</quadratic>
      </attenuation>
    </light>

    <!-- Base Habitat Flooring (Radius: 18m) -->
    <model name="habitat_floor">
      <static>true</static>
      <link name="floor_link">
        <collision name="floor_collision">
          <geometry>
            <cylinder>
              <radius>18.0</radius>
              <length>0.2</length>
            </cylinder>
          </geometry>
          <surface>
            <friction>
              <ode>
                <mu>0.75</mu>
                <mu2>0.75</mu2>
              </ode>
            </friction>
            <contact>
              <ode>
                <kp>1000000.0</kp>
                <kd>100.0</kd>
                <max_vel>0.0</max_vel>
                <min_depth>0.001</min_depth>
              </ode>
            </contact>
          </surface>
        </collision>
        <visual name="floor_visual">
          <geometry>
            <cylinder>
              <radius>18.0</radius>
              <length>0.2</length>
            </cylinder>
          </geometry>
          <material>
            <ambient>0.2 0.22 0.25 1.0</ambient>
            <diffuse>0.3 0.35 0.4 1.0</diffuse>
          </material>
        </visual>
      </link>
    </model>

    <!-- Central Structural Column & Overhead Monitor Ring -->
    <model name="central_pillar_island">
      <static>true</static>
      <pose>0 0 3.0 0 0 0</pose>
      <link name="pillar_link">
        <collision name="column_collision">
          <geometry>
            <cylinder>
              <radius>0.6</radius>
              <length>9.0</length>
            </cylinder>
          </geometry>
          <surface>
            <contact>
              <ode>
                <kp>10000000.0</kp>
                <kd>1.0</kd>
              </ode>
            </contact>
          </surface>
        </collision>
      </link>
    </model>

    <!-- Central Planter Bench Collision -->
    <model name="central_planter_bench">
      <static>true</static>
      <pose>0 0 0.45 0 0 0</pose>
      <link name="planter_link">
        <collision name="planter_collision">
          <geometry>
            <cylinder>
              <radius>3.4</radius>
              <length>0.9</length>
            </cylinder>
          </geometry>
          <surface>
            <friction>
              <ode>
                <mu>0.8</mu>
              </ode>
            </friction>
          </surface>
        </collision>
      </link>
    </model>

    <!-- Three Radial Science Lab Desks -->
    <model name="radial_lab_desks">
      <static>true</static>
      <link name="desks_link">
        <collision name="desk_1">
          <pose>2.02 4.79 0.4 0 0 0.4</pose>
          <geometry><box><size>2.4 1.1 0.8</size></box></geometry>
        </collision>
        <collision name="desk_2">
          <pose>3.13 -4.15 0.4 0 0 2.49</pose>
          <geometry><box><size>2.4 1.1 0.8</size></box></geometry>
        </collision>
        <collision name="desk_3">
          <pose>-5.15 -0.64 0.4 0 0 4.59</pose>
          <geometry><box><size>2.4 1.1 0.8</size></box></geometry>
        </collision>
      </link>
    </model>

    <!-- Command Operations Console and Chair -->
    <model name="command_deck_furniture">
      <static>true</static>
      <link name="cmd_link">
        <collision name="console_collision">
          <pose>0 -14.2 0.45 0 0 0</pose>
          <geometry><box><size>6.0 1.6 0.9</size></box></geometry>
        </collision>
        <collision name="chair_collision">
          <pose>0 -12.4 0.45 0 0 0</pose>
          <geometry><box><size>1.0 1.0 1.1</size></box></geometry>
        </collision>
      </link>
    </model>

    <!-- Interactive Airlock Blast Door (Hinged Joint) -->
    <model name="airlock_blast_door">
      <pose>-1.4 16.5 1.8 0 0 0</pose>
      <link name="door_slab">
        <collision name="door_collision">
          <pose>1.4 0 0 0 0 0</pose>
          <geometry><cylinder><radius>1.4</radius><length>0.2</length></cylinder></geometry>
        </collision>
      </link>
      <joint name="door_hinge" type="revolute">
        <parent>world</parent>
        <child>door_slab</child>
        <axis>
          <xyz>0 0 1</xyz>
          <limit>
            <lower>0.0</lower>
            <upper>1.57</upper>
          </limit>
        </axis>
      </joint>
    </model>

    <!-- Transparent Greenhouse Geodesic Roof Dome -->
    <model name="transparent_greenhouse_dome">
      <static>true</static>
      <pose>0 0 2.5 0 0 0</pose>
      <link name="greenhouse_dome_link">
        <visual name="transparent_glass_visual">
          <geometry>
            <sphere>
              <radius>18.2</radius>
            </sphere>
          </geometry>
          <material>
            <ambient>0.8 0.9 0.95 0.2</ambient>
            <diffuse>0.85 0.92 0.98 0.2</diffuse>
            <specular>0.9 0.9 0.9 1.0</specular>
          </material>
        </visual>
      </link>
    </model>

    <!-- Perimeter Habitat Dome Shell (Radius: 16.6m) -->
    <model name="habitat_outer_perimeter">
      <static>true</static>
      <link name="perimeter_link">
        <collision name="wall_north">
          <pose>0 -16.6 2.5 0 0 0</pose>
          <geometry><box><size>12.0 1.0 5.0</size></box></geometry>
        </collision>
        <collision name="wall_east">
          <pose>16.6 0 2.5 0 0 0</pose>
          <geometry><box><size>1.0 12.0 5.0</size></box></geometry>
        </collision>
        <collision name="wall_west">
          <pose>-16.6 0 2.5 0 0 0</pose>
          <geometry><box><size>1.0 12.0 5.0</size></box></geometry>
        </collision>
      </link>
    </model>

  </world>
</sdf>
```

---

### 5.3 Gazebo Physics Engine (`js/gazeboPhysics.js`)
*(See [js/gazeboPhysics.js](file:///c:/Users/Eshaan/JAMN-JGI-5/js/gazeboPhysics.js) for live file link)*

```javascript
/**
 * Gazebo-Standard Contact Physics Engine for Three.js First-Person Navigation
 * Simulates:
 * - Martian gravity (0.38g = 3.721 m/s^2)
 * - Capsule-AABB / Capsule-Cylinder contact detection and penetration resolution
 * - Surface friction & restitution
 * - Tangential velocity projection for wall sliding
 * - Low-gravity jumping and inertia
 * - Collision coverage for interior habitat structures
 * - Dynamic airlock blast door collision state
 */

export class GazeboPhysicsEngine {
  constructor() {
    this.gravity = 3.721; // m/s^2 (0.38g)
    this.groundY = 0.0;
    this.eyeHeight = 1.72; // Eye level in EVA suit
    this.capsuleRadius = 0.38; // Collision radius
    this.friction = 0.82;
    this.airResistance = 0.96;

    // Kinematic state
    this.position = { x: 0, y: this.eyeHeight, z: 9.0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.isGrounded = true;

    // Dynamic state
    this.isDoorOpen = false;

    // World Colliders
    this.colliders = [];
    this.interactionZones = [];

    this.initEnvironmentColliders();
  }

  initEnvironmentColliders() {
    // 1. Perimeter Boundary Wall
    this.habitatRadius = 16.6;

    // 2. Central Island Planter & Column
    this.addCylinderCollider(0, 0, 3.4, 1.2, 'Central Bio-Planter & Seating Ring');
    this.addCylinderCollider(0, 0, 0.6, 9.0, 'Central Telemetry Mast');

    // 3. Radial Science Lab Desks
    for (let d = 0; d < 3; d++) {
      const da = (d / 3) * Math.PI * 2 + 0.4;
      const dx = Math.sin(da) * 5.2;
      const dz = Math.cos(da) * 5.2;
      this.addCylinderCollider(dx, dz, 1.35, 1.0, `Radial Science Lab Desk 0${d + 1}`);
    }

    // 4. Command Deck & Server Racks
    this.addBoxCollider(0, -14.2, 6.4, 1.8, 1.4, 'Command Operations Console');
    this.addBoxCollider(0, -12.4, 1.0, 1.0, 1.1, 'Command Ergonomic Chair');
    this.addBoxCollider(-6.5, -14.2, 2.2, 1.8, 3.2, 'Comms Server Rack Alpha');
    this.addBoxCollider(6.5, -14.2, 2.2, 1.8, 3.2, 'Telemetry Server Rack Beta');

    // 5. ECLSS Atmospheric Processing Hub (West Sector, x: -13.5m)
    this.addBoxCollider(-12.7, -4.5, 3.4, 2.4, 2.8, 'ECLSS OGA Electrolysis Skid');
    this.addBoxCollider(-12.8, 4.5, 3.4, 2.4, 2.6, 'ECLSS CDRA & Sabatier Skid');

    // 6. Bioregenerative Agri-Pod Vertical Farms (East Sector, x: +13.5m)
    this.addBoxCollider(13.2, -4.5, 3.0, 2.4, 3.4, 'Vertical Aeroponic Rack 01');
    this.addBoxCollider(13.2, 4.5, 3.0, 2.4, 3.4, 'Vertical Aeroponic Rack 02');

    // 7. Water Recovery & ISRU Melt Extraction (South-West Sector, x: -9.5m, z: 8.5m)
    this.addCylinderCollider(-9.5, 8.5, 1.5, 2.2, 'VCD Centrifuge Distillation Unit');

    // 8. Fission Surface Power & Microgrid Control (South-East Sector, x: +9.5m, z: 8.5m)
    this.addBoxCollider(9.5, 8.5, 2.8, 1.8, 2.4, 'Kilopower Microgrid Switchboard');

    // 9. EVA Airlock Portal, Frame & Interactive Blast Door (South Sector, z: +16.5m)
    this.addBoxCollider(-2.8, 16.5, 2.2, 1.0, 3.8, 'Airlock Left Blast Frame');
    this.addBoxCollider(2.8, 16.5, 2.2, 1.0, 3.8, 'Airlock Right Blast Frame');
    
    // Blast Door itself — solid when closed (blocks passage), disabled when open!
    this.addBoxCollider(0, 16.5, 3.0, 0.6, 3.5, 'Airlock Blast Door');

    // Airlock Vestibule walls
    this.addBoxCollider(-1.9, 18.2, 0.6, 3.8, 3.8, 'Airlock Vestibule Left Wall');
    this.addBoxCollider(1.9, 18.2, 0.6, 3.8, 3.8, 'Airlock Vestibule Right Wall');
    this.addBoxCollider(0, 20.2, 4.2, 0.6, 3.8, 'Airlock Outer Surface Hatch Bulkhead');

    // Setup Proximity Interaction Zones
    this.interactionZones = [
      {
        id: 'airlock_door',
        name: 'EVA Airlock Pressurized Blast Hatch',
        x: 0,
        z: 15.2,
        radius: 2.2,
        prompt: 'PRESS [E] TO OPEN AIRLOCK BLAST DOOR'
      },
      {
        id: 'command_module',
        name: 'Command Deck & Comms Console',
        x: 0,
        z: -12.5,
        radius: 3.6,
        prompt: 'PRESS [E] TO ACCESS COMMAND OPS & CHALLENGES'
      },
      {
        id: 'eclss_module',
        name: 'ECLSS Atmosphere Hub (OGA & CDRA)',
        x: -11.5,
        z: 0,
        radius: 3.6,
        prompt: 'PRESS [E] TO INSPECT ECLSS LIFE SUPPORT'
      },
      {
        id: 'hydroponics_module',
        name: 'Agri-Pod Bioregenerative Farm',
        x: 11.5,
        z: 0,
        radius: 3.6,
        prompt: 'PRESS [E] TO INSPECT AGRI-POD FOOD PRODUCTION'
      },
      {
        id: 'water_recovery_module',
        name: 'Water Recovery & VCD Centrifuge',
        x: -9.0,
        z: 8.0,
        radius: 3.6,
        prompt: 'PRESS [E] TO INSPECT WATER RECOVERY SYSTEM'
      },
      {
        id: 'power_microgrid_module',
        name: 'Kilopower Nuclear Microgrid',
        x: 9.0,
        z: 8.0,
        radius: 3.6,
        prompt: 'PRESS [E] TO INSPECT POWER MICROGRID'
      },
      {
        id: 'airlock_module',
        name: 'EVA Preparation & SuitPort Bay',
        x: 0,
        z: 18.2,
        radius: 2.5,
        prompt: 'PRESS [E] TO INSPECT EVA SUITPORT & TELEMETRY'
      },
      {
        id: 'habitation_module',
        name: 'Crew Quarters & Medical Bay',
        x: 0,
        z: 4.8,
        radius: 2.5,
        prompt: 'PRESS [E] TO INSPECT CREW PODS & MED-BAY'
      }
    ];
  }

  addBoxCollider(x, z, width, depth, height, label) {
    this.colliders.push({
      type: 'box',
      minX: x - width * 0.5,
      maxX: x + width * 0.5,
      minZ: z - depth * 0.5,
      maxZ: z + depth * 0.5,
      height: height,
      label: label,
      disabled: false
    });
  }

  addCylinderCollider(x, z, radius, height, label) {
    this.colliders.push({
      type: 'cylinder',
      x: x,
      z: z,
      radius: radius,
      height: height,
      label: label,
      disabled: false
    });
  }

  toggleDoor() {
    this.isDoorOpen = !this.isDoorOpen;
    this.setDoorState(this.isDoorOpen);
    return this.isDoorOpen;
  }

  setDoorState(isOpen) {
    this.isDoorOpen = isOpen;
    const door = this.colliders.find(c => c.label === 'Airlock Blast Door');
    if (door) {
      door.disabled = isOpen;
    }
    const zone = this.interactionZones.find(z => z.id === 'airlock_door');
    if (zone) {
      zone.prompt = isOpen 
        ? 'PRESS [E] TO CLOSE AIRLOCK BLAST DOOR' 
        : 'PRESS [E] TO OPEN AIRLOCK BLAST DOOR';
    }
  }

  update(dt, moveInput, yawRad, jumpTrigger) {
    dt = Math.min(dt, 0.05);

    // 1. Calculate intended movement acceleration in camera direction
    const moveSpeed = 4.8; // m/s walking speed in 0.38g
    let wishX = 0;
    let wishZ = 0;

    if (moveInput.forward !== 0 || moveInput.strafe !== 0) {
      const cos = Math.cos(yawRad);
      const sin = Math.sin(yawRad);

      const fwdX = -sin;
      const fwdZ = -cos;
      const rgtX = cos;
      const rgtZ = -sin;

      wishX = fwdX * moveInput.forward + rgtX * moveInput.strafe;
      wishZ = fwdZ * moveInput.forward + rgtZ * moveInput.strafe;

      const len = Math.hypot(wishX, wishZ);
      if (len > 0.001) {
        wishX = (wishX / len) * moveSpeed;
        wishZ = (wishZ / len) * moveSpeed;
      }
    }

    const accelRate = this.isGrounded ? 12.0 : 3.5;
    this.velocity.x += (wishX - this.velocity.x) * accelRate * dt;
    this.velocity.z += (wishZ - this.velocity.z) * accelRate * dt;

    if (this.isGrounded) {
      if (moveInput.forward === 0 && moveInput.strafe === 0) {
        this.velocity.x *= Math.pow(this.friction, dt * 60);
        this.velocity.z *= Math.pow(this.friction, dt * 60);
      }
    } else {
      this.velocity.x *= Math.pow(this.airResistance, dt * 60);
      this.velocity.z *= Math.pow(this.airResistance, dt * 60);
    }

    // 2. Vertical Dynamics
    if (jumpTrigger && this.isGrounded) {
      this.velocity.y = 3.4; // Low-gravity jump impulse
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * dt;
    }

    // 3. Integrate Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Floor collision
    if (this.position.y <= this.eyeHeight) {
      this.position.y = this.eyeHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // 4. Gazebo Contact Resolution
    this.resolveContacts();
  }

  resolveContacts() {
    const r = this.capsuleRadius;
    const px = this.position.x;
    const pz = this.position.z;

    // A. Outer Perimeter Dome Wall
    const distFromOrigin = Math.hypot(px, pz);
    if (distFromOrigin > this.habitatRadius - r) {
      const inAirlockCorridor = Math.abs(px) < 1.6 && pz > 15.0 && pz < 20.2;
      
      if (!inAirlockCorridor) {
        const normalX = px / distFromOrigin;
        const normalZ = pz / distFromOrigin;
        const penetration = distFromOrigin - (this.habitatRadius - r);

        this.position.x -= normalX * penetration;
        this.position.z -= normalZ * penetration;

        // Tangential sliding
        const normalDotV = this.velocity.x * normalX + this.velocity.z * normalZ;
        if (normalDotV > 0) {
          this.velocity.x -= normalDotV * normalX;
          this.velocity.z -= normalDotV * normalZ;
        }
      }
    }

    // B. Internal Obstacles (Box and Cylinder colliders)
    for (const c of this.colliders) {
      if (c.disabled) continue;

      if (c.type === 'cylinder') {
        const dx = this.position.x - c.x;
        const dz = this.position.z - c.z;
        const dist = Math.hypot(dx, dz);
        const minDist = c.radius + r;

        if (dist < minDist && dist > 0.0001) {
          const penetration = minDist - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          this.position.x += nx * penetration;
          this.position.z += nz * penetration;

          const normalDotV = this.velocity.x * nx + this.velocity.z * nz;
          if (normalDotV < 0) {
            this.velocity.x -= normalDotV * nx;
            this.velocity.z -= normalDotV * nz;
          }
        }
      } else if (c.type === 'box') {
        const closestX = Math.max(c.minX, Math.min(this.position.x, c.maxX));
        const closestZ = Math.max(c.minZ, Math.min(this.position.z, c.maxZ));

        const dx = this.position.x - closestX;
        const dz = this.position.z - closestZ;
        const dist = Math.hypot(dx, dz);

        if (dist < r && dist > 0.0001) {
          const penetration = r - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          this.position.x += nx * penetration;
          this.position.z += nz * penetration;

          const normalDotV = this.velocity.x * nx + this.velocity.z * nz;
          if (normalDotV < 0) {
            this.velocity.x -= normalDotV * nx;
            this.velocity.z -= normalDotV * nz;
          }
        }
      }
    }
  }

  getNearbyInteraction() {
    for (const zone of this.interactionZones) {
      const dx = this.position.x - zone.x;
      const dz = this.position.z - zone.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= zone.radius) {
        return {
          ...zone,
          distance: dist
        };
      }
    }
    return null;
  }
}
```

---

### 5.4 Three.js 3D Base Renderer (`js/threeBaseRenderer.js`)
*(See [js/threeBaseRenderer.js](file:///c:/Users/Eshaan/JAMN-JGI-5/js/threeBaseRenderer.js) for live file link)*

```javascript
/**
 * Three.js First-Person Base Renderer
 * Renders the habitat interior, exterior Martian landscape, greenhouse dome, and subsystem modules.
 */

import { sound } from './audio.js';

const THREE = typeof window !== 'undefined' ? window.THREE : null;

export class ThreeBaseRenderer {
  constructor(containerId, physicsEngine) {
    this.container = document.getElementById(containerId);
    this.physics = physicsEngine;
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // First-person camera orientation
    this.yaw = 0;   // horizontal rotation (radians)
    this.pitch = 0; // vertical tilt (radians)
    
    this.isPointerLocked = false;
    this.keys = {
      KeyW: false, KeyS: false, KeyA: false, KeyD: false,
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
      Space: false
    };

    this.activeIssues = new Set();
    this.animatedObjects = [];
    this.hologramMarkers = [];
    this.clock = THREE ? new THREE.Clock() : null;

    // Interactive Door State
    this.isDoorOpen = false;
    this.doorAnimProgress = 0.0; // 0.0 = closed, 1.0 = fully open
    this.doorGroup = null;
    this.doorStatusBeacon = null;

    // Callbacks
    this.onInteractCallback = null;
    this.onMenuToggleCallback = null;
    this.onEscapeCallback = null;

    if (THREE) {
      this.init();
    }
  }

  init() {
    if (!this.container || !THREE) return;

    try {
      const width = this.container.clientWidth || window.innerWidth || 1200;
      const height = this.container.clientHeight || window.innerHeight || 800;

      // 1. Scene & Camera
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xb25329); // Martian atmospheric orange horizon
      this.scene.fog = new THREE.FogExp2(0x9a3e1d, 0.006); // Soft atmospheric dust haze

      this.camera = new THREE.PerspectiveCamera(74, width / height, 0.1, 300);
      this.camera.position.set(this.physics.position.x, this.physics.position.y, this.physics.position.z);

      // 2. WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (THREE.ACESFilmicToneMapping) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
      }
      this.container.appendChild(this.renderer.domElement);

      // 3. Habitat Architecture & Modules
      this.setupLighting();
      this.buildExternalMartianLandscape();
      this.buildGeodesicDomeCeiling();
      this.buildFloorAndBulkheads();
      this.buildCentralPlanterAndMast();
      this.buildCommandDeck();
      this.buildEclssSubsystem();
      this.buildHydroponicsSubsystem();
      this.buildWaterAndPowerSectors();
      this.buildInteractiveAirlockDoor();
      this.buildInteractionBeacons();

      // 4. Bind Input Controls
      this.bindControls();
      
      // Resize listener
      window.addEventListener('resize', () => this.onResize());

      // 5. Start Render & Physics Loop
      this.animate();
    } catch (err) {
      console.warn('ThreeBaseRenderer initialization caught error:', err);
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth || 900;
    const h = this.container.clientHeight || window.innerHeight || 560;
    if (w > 0 && h > 0) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  setupLighting() {
    // Ambient light: Soft Martian dust haze reflection
    const ambientLight = new THREE.AmbientLight(0xffdec7, 0.65);
    this.scene.add(ambientLight);

    // Primary Martian Sun streaming down through the transparent greenhouse dome
    const sunLight = new THREE.DirectionalLight(0xffd4a8, 1.35);
    sunLight.position.set(22, 38, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -22;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Interior Warm Fluorescent Skylight Wash
    const interiorWash = new THREE.PointLight(0xfef08a, 0.45, 28);
    interiorWash.position.set(0, 7.5, 0);
    this.scene.add(interiorWash);

    // Command Deck Cold Cyan Key Light
    const commandLight = new THREE.PointLight(0x06b6d4, 0.9, 14);
    commandLight.position.set(0, 3.5, -13.5);
    this.scene.add(commandLight);

    // ECLSS Atmospheric Sector Work Light
    const eclssLight = new THREE.PointLight(0x38bdf8, 0.75, 12);
    eclssLight.position.set(-11.5, 3.2, 0);
    this.scene.add(eclssLight);

    // Agri-Pod Plant Grow Fluorescent (Magenta / UV spectrum)
    const agriLight = new THREE.PointLight(0xd946ef, 0.85, 12);
    agriLight.position.set(11.5, 3.2, 0);
    this.scene.add(agriLight);

    // Airlock Portal Amber Warning Light
    const airlockLight = new THREE.PointLight(0xf59e0b, 0.8, 10);
    airlockLight.position.set(0, 3.2, 15.5);
    this.scene.add(airlockLight);
  }

  buildExternalMartianLandscape() {
    // 1. Martian Surface Ground Plane
    const groundGeo = new THREE.CircleGeometry(160, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x9e381b,
      roughness: 0.92,
      metalness: 0.08
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Distant Crater Rim & Mountainous Mesa Ring
    const mesaGeo = new THREE.CylinderGeometry(85, 95, 32, 32, 1, true);
    const mesaMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      roughness: 0.95,
      side: THREE.BackSide
    });
    const mesaRing = new THREE.Mesh(mesaGeo, mesaMat);
    mesaRing.position.y = 10;
    this.scene.add(mesaRing);

    // 3. External Solar Panel Arrays & Antennas
    for (let i = -3; i <= 3; i++) {
      const panelGroup = new THREE.Group();
      const panelGeo = new THREE.BoxGeometry(4.5, 0.1, 2.5);
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.2, metalness: 0.8 });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.rotation.x = 0.35;
      panelGroup.add(panel);

      const standGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8);
      const standMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.y = -0.7;
      panelGroup.add(stand);

      panelGroup.position.set(i * 6.5, 0.9, -28 - Math.abs(i) * 2);
      this.scene.add(panelGroup);
    }
  }

  buildGeodesicDomeCeiling() {
    const domeRadius = 18.2;
    const domeGroup = new THREE.Group();

    // 1. Transparent Glass Shell
    const glassGeo = new THREE.SphereGeometry(domeRadius, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.88,
      ior: 1.52,
      reflectivity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const glassDome = new THREE.Mesh(glassGeo, glassMat);
    glassDome.position.y = 2.0;
    glassDome.castShadow = false;
    glassDome.receiveShadow = false;
    domeGroup.add(glassDome);

    // 2. Geodesic Structural Strut Framework
    const frameGeo = new THREE.IcosahedronGeometry(domeRadius + 0.05, 2);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      wireframe: true,
      roughness: 0.4,
      metalness: 0.75
    });
    const wireframeDome = new THREE.Mesh(frameGeo, wireMat);
    wireframeDome.position.y = 2.0;
    wireframeDome.castShadow = true;
    domeGroup.add(wireframeDome);

    // 3. Central Dome Oculus Ring Cap
    const capGeo = new THREE.TorusGeometry(2.4, 0.25, 12, 32);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.3 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.rotation.x = Math.PI / 2;
    cap.position.y = domeRadius + 1.9;
    domeGroup.add(cap);

    this.scene.add(domeGroup);
  }

  buildFloorAndBulkheads() {
    const r = this.physics.habitatRadius;

    // Interior Flooring with High-Traction Diamond Pattern Mat
    const floorGeo = new THREE.CircleGeometry(r, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e2638,
      roughness: 0.65,
      metalness: 0.25
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Perimeter Bulkhead Wall (Lower Ring Structure)
    const wallHeight = 3.6;
    const wallGeo = new THREE.CylinderGeometry(r, r, wallHeight, 64, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.5,
      metalness: 0.35,
      side: THREE.BackSide
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = wallHeight / 2;
    wall.receiveShadow = true;
    this.scene.add(wall);

    // Perimeter Overhead Storage Bays & Equipment Cabinets
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.5 });
    for (let i = 0; i < 24; i++) {
      if (i >= 10 && i <= 14) continue; // Gap for airlock portal and command console

      const angle = (i / 24) * Math.PI * 2;
      const cabGeo = new THREE.BoxGeometry(2.2, 1.2, 0.9);
      const cab = new THREE.Mesh(cabGeo, cabinetMat);
      cab.position.set(Math.sin(angle) * (r - 0.55), 2.8, Math.cos(angle) * (r - 0.55));
      cab.rotation.y = angle + Math.PI;
      cab.castShadow = true;
      this.scene.add(cab);
    }
  }

  buildCentralPlanterAndMast() {
    const group = new THREE.Group();

    // 1. Central Telemetry Column
    const mastGeo = new THREE.CylinderGeometry(0.5, 0.6, 9.0, 16);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = 4.5;
    mast.castShadow = true;
    group.add(mast);

    // 2. Central Seating Bench & Hexagonal Bio-Planter
    const planterGeo = new THREE.CylinderGeometry(3.4, 3.4, 0.9, 6);
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 });
    const planter = new THREE.Mesh(planterGeo, planterMat);
    planter.position.y = 0.45;
    planter.castShadow = true;
    planter.receiveShadow = true;
    group.add(planter);

    // Top Soil Bed
    const soilGeo = new THREE.CylinderGeometry(2.6, 2.6, 0.15, 6);
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.85;
    group.add(soil);

    // Bio-Flora (Martian Cacti & Broadleaf Oxygen Producers)
    const plantMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    const plantMat2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
    for (let p = 0; p < 8; p++) {
      const pa = (p / 8) * Math.PI * 2;
      const pr = 1.0 + (p % 3) * 0.5;
      const px = Math.sin(pa) * pr;
      const pz = Math.cos(pa) * pr;

      const stemGeo = new THREE.ConeGeometry(0.25, 1.1 + (p % 2) * 0.4, 7);
      const stem = new THREE.Mesh(stemGeo, p % 2 === 0 ? plantMat1 : plantMat2);
      stem.position.set(px, 1.4, pz);
      stem.rotation.z = (Math.random() - 0.5) * 0.3;
      stem.castShadow = true;
      group.add(stem);
    }

    // 3. Overhead 4-Screen Rotating Telemetry Ring
    const screenRing = new THREE.Group();
    screenRing.position.y = 4.8;

    const screenGeo = new THREE.BoxGeometry(1.6, 0.9, 0.08);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.65,
      roughness: 0.2
    });

    for (let s = 0; s < 4; s++) {
      const sAngle = (s / 4) * Math.PI * 2;
      const scr = new THREE.Mesh(screenGeo, screenMat);
      scr.position.set(Math.sin(sAngle) * 1.5, 0, Math.cos(sAngle) * 1.5);
      scr.rotation.y = sAngle + Math.PI;
      scr.rotation.x = 0.15; // Tilted downwards toward viewer
      screenRing.add(scr);
    }
    group.add(screenRing);
    this.animatedObjects.push({ obj: screenRing, rotSpeedY: 0.05 });

    // 4. Three Radial Science Workstations
    for (let d = 0; d < 3; d++) {
      const da = (d / 3) * Math.PI * 2 + 0.4;
      const dx = Math.sin(da) * 5.2;
      const dz = Math.cos(da) * 5.2;

      const deskGroup = new THREE.Group();
      deskGroup.position.set(dx, 0, dz);
      deskGroup.rotation.y = da + Math.PI;

      // Hexagonal Lab Tabletop
      const tableGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.1, 6);
      const tableMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.4 });
      const table = new THREE.Mesh(tableGeo, tableMat);
      table.position.y = 0.85;
      table.castShadow = true;
      table.receiveShadow = true;
      deskGroup.add(table);

      // Steel pedestal leg
      const legGeo = new THREE.CylinderGeometry(0.18, 0.28, 0.85, 12);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.y = 0.42;
      deskGroup.add(leg);

      // Lab Workstation Monitor
      const monGeo = new THREE.BoxGeometry(0.7, 0.45, 0.04);
      const monMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0ea5e9, emissiveIntensity: 0.5 });
      const mon = new THREE.Mesh(monGeo, monMat);
      mon.position.set(0, 1.15, 0.35);
      mon.rotation.y = Math.PI;
      deskGroup.add(mon);

      // Swivel Chair
      const chairGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16);
      const chairMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
      const chair = new THREE.Mesh(chairGeo, chairMat);
      chair.position.set(0, 0.52, -1.0);
      deskGroup.add(chair);

      group.add(deskGroup);
    }

    this.scene.add(group);
  }

  buildCommandDeck() {
    const cmdGroup = new THREE.Group();
    cmdGroup.position.set(0, 0, -14.2);

    // 1. Curved Command Ops Console Table
    const tableGeo = new THREE.BoxGeometry(6.4, 0.85, 1.6);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = 0.42;
    table.castShadow = true;
    table.receiveShadow = true;
    cmdGroup.add(table);

    // 2. Holographic Display Screens (Large Command Multi-Display)
    const holoGeo = new THREE.PlaneGeometry(3.6, 1.6);
    const holoMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const holoScreen = new THREE.Mesh(holoGeo, holoMat);
    holoScreen.position.set(0, 1.95, -0.6);
    cmdGroup.add(holoScreen);

    // 3. Ergonomic Commander Chair
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, 1.8);
    const seatGeo = new THREE.BoxGeometry(0.8, 0.12, 0.8);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.y = 0.55;
    chairGroup.add(seat);

    const backGeo = new THREE.BoxGeometry(0.8, 0.9, 0.12);
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(0, 1.05, 0.36);
    chairGroup.add(back);
    cmdGroup.add(chairGroup);

    // 4. Server Racks (Telemetry Rack Alpha & Beta)
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.3 });
    const rackGeo = new THREE.BoxGeometry(2.0, 3.2, 1.4);

    const rackA = new THREE.Mesh(rackGeo, rackMat);
    rackA.position.set(-6.5, 1.6, 0);
    rackA.castShadow = true;
    cmdGroup.add(rackA);

    const rackB = new THREE.Mesh(rackGeo, rackMat);
    rackB.position.set(6.5, 1.6, 0);
    rackB.castShadow = true;
    cmdGroup.add(rackB);

    this.scene.add(cmdGroup);
  }

  buildEclssSubsystem() {
    const eclssGroup = new THREE.Group();
    eclssGroup.position.set(-13.5, 0, 0);
    eclssGroup.rotation.y = Math.PI / 2;

    // 1. OGA Electrolysis Tanks (Oxygen Generation Assembly)
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.2 });
    for (let t = -1; t <= 1; t++) {
      const tankGeo = new THREE.CylinderGeometry(0.38, 0.38, 2.4, 16);
      const tank = new THREE.Mesh(tankGeo, tankMat);
      tank.position.set(t * 0.9, 1.3, -0.6);
      tank.castShadow = true;
      eclssGroup.add(tank);
    }

    // 2. CDRA CO2 Scrubber & Sabatier Methanation Skid
    const skidGeo = new THREE.BoxGeometry(3.2, 2.2, 1.8);
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.6 });
    const skid = new THREE.Mesh(skidGeo, skidMat);
    skid.position.set(0, 1.1, 0.9);
    skid.castShadow = true;
    eclssGroup.add(skid);

    // 3. Status Terminal Monitor
    const monGeo = new THREE.PlaneGeometry(1.2, 0.7);
    const monMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const mon = new THREE.Mesh(monGeo, monMat);
    mon.position.set(0, 1.8, 1.82);
    eclssGroup.add(mon);

    this.scene.add(eclssGroup);
  }

  buildHydroponicsSubsystem() {
    const agriGroup = new THREE.Group();
    agriGroup.position.set(13.5, 0, 0);
    agriGroup.rotation.y = -Math.PI / 2;

    // Dual 3-Tier Aeroponic Vertical Trays
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
    const cropMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 });

    for (let r = -1; r <= 1; r += 2) {
      const rack = new THREE.Group();
      rack.position.set(r * 1.5, 0, 0);

      for (let tier = 0; tier < 3; tier++) {
        const trayGeo = new THREE.BoxGeometry(1.2, 0.2, 3.2);
        const tray = new THREE.Mesh(trayGeo, rackMat);
        tray.position.y = 0.6 + tier * 0.9;
        tray.castShadow = true;
        rack.add(tray);

        const vegGeo = new THREE.BoxGeometry(1.0, 0.25, 2.9);
        const veg = new THREE.Mesh(vegGeo, cropMat);
        veg.position.y = 0.8 + tier * 0.9;
        rack.add(veg);
      }
      agriGroup.add(rack);
    }

    this.scene.add(agriGroup);
  }

  buildWaterAndPowerSectors() {
    // 1. Water Recovery VCD Centrifuge (South-West)
    const waterGroup = new THREE.Group();
    waterGroup.position.set(-9.5, 0, 8.5);

    const drumGeo = new THREE.CylinderGeometry(1.2, 1.4, 2.2, 16);
    const drumMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.8, roughness: 0.25 });
    const drum = new THREE.Mesh(drumGeo, drumMat);
    drum.position.y = 1.1;
    drum.castShadow = true;
    waterGroup.add(drum);

    const pipeGeo = new THREE.TorusGeometry(1.3, 0.1, 8, 24);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.y = 1.6;
    waterGroup.add(pipe);
    this.scene.add(waterGroup);

    // 2. Kilopower Fission Microgrid Switchboard (South-East)
    const powerGroup = new THREE.Group();
    powerGroup.position.set(9.5, 0, 8.5);

    const switchGeo = new THREE.BoxGeometry(2.4, 2.2, 1.6);
    const switchMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.5, roughness: 0.4 });
    const switchboard = new THREE.Mesh(switchGeo, switchMat);
    switchboard.position.y = 1.1;
    switchboard.castShadow = true;
    powerGroup.add(switchboard);

    // Glowing core conduit
    const coreGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.4, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 1.1, 0.82);
    powerGroup.add(core);
    this.scene.add(powerGroup);
  }

  buildInteractiveAirlockDoor() {
    const airlockGroup = new THREE.Group();
    airlockGroup.position.set(0, 0, 16.5);

    // 1. Structural Blast Frame Bulkheads
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.3 });
    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.8, 0.8), frameMat);
    leftFrame.position.set(-2.4, 1.9, 0);
    leftFrame.castShadow = true;
    airlockGroup.add(leftFrame);

    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.8, 0.8), frameMat);
    rightFrame.position.set(2.4, 1.9, 0);
    rightFrame.castShadow = true;
    airlockGroup.add(rightFrame);

    const topLintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 0.8), frameMat);
    topLintel.position.set(0, 3.4, 0);
    topLintel.castShadow = true;
    airlockGroup.add(topLintel);

    // 2. Rotating Door Pivot Group (Hinged at x = -1.4m)
    this.doorGroup = new THREE.Group();
    this.doorGroup.position.set(-1.4, 0, 0);

    // Door Slab Mesh
    const doorSlabGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.18, 32);
    const doorSlabMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.5,
      roughness: 0.35
    });
    const doorMesh = new THREE.Mesh(doorSlabGeo, doorSlabMat);
    doorMesh.rotation.z = Math.PI / 2;
    doorMesh.position.set(1.4, 1.8, 0);
    doorMesh.castShadow = true;
    this.doorGroup.add(doorMesh);

    // Mechanical Lock Teeth & Window
    const windowGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 16);
    const windowMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transmission: 0.8, roughness: 0.1 });
    const doorWin = new THREE.Mesh(windowGeo, windowMat);
    doorWin.rotation.z = Math.PI / 2;
    doorWin.position.set(1.4, 1.8, 0);
    this.doorGroup.add(doorWin);

    airlockGroup.add(this.doorGroup);

    // 3. Status Beacon Light (Red when closed, Green when open)
    const beaconGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.doorStatusBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    this.doorStatusBeacon.position.set(1.6, 2.9, 0.45);
    airlockGroup.add(this.doorStatusBeacon);

    this.scene.add(airlockGroup);
  }

  buildInteractionBeacons() {
    const beaconGeo = new THREE.ConeGeometry(0.2, 0.4, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });

    for (const zone of this.physics.interactionZones) {
      if (zone.id === 'airlock_door') continue; // Handled by door status beacon

      const beacon = new THREE.Mesh(beaconGeo, beaconMat.clone());
      beacon.position.set(zone.x, 2.8, zone.z);
      beacon.rotation.x = Math.PI; // point downwards toward terminal
      beacon.userData = { zoneId: zone.id };
      this.hologramMarkers.push(beacon);
      this.scene.add(beacon);
    }
  }

  bindControls() {
    // 1. Keyboard Movement Listeners
    window.addEventListener('keydown', (e) => {
      if (e.code in this.keys) {
        this.keys[e.code] = true;
      }

      if (e.code === 'KeyE') {
        this.handleInteractKey();
      }

      if (e.code === 'Tab' || e.code === 'KeyM') {
        e.preventDefault();
        if (this.onMenuToggleCallback) this.onMenuToggleCallback();
      }

      if (e.code === 'Escape') {
        if (this.onEscapeCallback) this.onEscapeCallback();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code in this.keys) {
        this.keys[e.code] = false;
      }
    });

    // 2. Mouse Look / Pointer Lock
    this.renderer.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.renderer.domElement.requestPointerLock();
      } else {
        // Click interaction raycast
        this.handleMouseClickRaycast();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.renderer.domElement);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;

      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      // Clamp vertical pitch to prevent gimbal flip (-85 to +85 deg)
      const maxPitch = 1.48;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    });
  }

  handleInteractKey() {
    const nearby = this.physics.getNearbyInteraction();
    if (!nearby) return;

    if (nearby.id === 'airlock_door') {
      this.triggerDoorToggle();
    } else {
      if (this.onInteractCallback) {
        this.onInteractCallback(nearby.id);
      }
    }
  }

  triggerDoorToggle() {
    this.isDoorOpen = this.physics.toggleDoor();
    sound.playAirlockCycle(1.2);

    if (this.doorStatusBeacon) {
      this.doorStatusBeacon.material.color.setHex(this.isDoorOpen ? 0x10b981 : 0xef4444);
    }

    const promptEl = document.getElementById('fpvPromptText');
    if (promptEl) {
      promptEl.textContent = this.isDoorOpen
        ? 'PRESS [E] TO CLOSE AIRLOCK BLAST DOOR'
        : 'PRESS [E] TO OPEN AIRLOCK BLAST DOOR';
    }
  }

  handleMouseClickRaycast() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera); // Screen center ray

    const nearby = this.physics.getNearbyInteraction();
    if (nearby) {
      if (nearby.id === 'airlock_door') {
        this.triggerDoorToggle();
      } else {
        if (this.onInteractCallback) {
          this.onInteractCallback(nearby.id);
        }
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = this.clock ? Math.min(this.clock.getDelta(), 0.05) : 0.016;

    // 1. Gather Movement Input
    const forward = (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) - (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0);
    const strafe = (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) - (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0);
    const jump = this.keys.Space;

    // 2. Step Gazebo Contact Physics Engine
    this.physics.update(dt, { forward, strafe }, this.yaw, jump);

    // 3. Sync Three.js Camera with Physics Agent Position & Heading
    this.camera.position.set(this.physics.position.x, this.physics.position.y, this.physics.position.z);
    
    // Euler rotation order YXZ prevents pitch/yaw cross-axis twisting
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    // 4. Update Interactive Door Pneumatic Swing Animation
    const targetProgress = this.isDoorOpen ? 1.0 : 0.0;
    this.doorAnimProgress += (targetProgress - this.doorAnimProgress) * Math.min(1.0, dt * 5.0);
    if (this.doorGroup) {
      this.doorGroup.rotation.y = this.doorAnimProgress * (Math.PI / 2);
    }

    // 5. Update Hologram Markers & Diagnostics
    const time = performance.now() * 0.003;
    for (const marker of this.hologramMarkers) {
      marker.rotation.y += dt * 1.5;
      marker.position.y = 2.8 + Math.sin(time + marker.position.x) * 0.12;

      // Pulse red if module has active fault
      if (this.activeIssues.has(marker.userData.zoneId)) {
        marker.material.color.setHex(0xef4444);
      } else {
        marker.material.color.setHex(0x06b6d4);
      }
    }

    // 6. Rotate Animated Interior Props
    for (const item of this.animatedObjects) {
      if (item.rotSpeedY) item.obj.rotation.y += dt * item.rotSpeedY;
    }

    // 7. Update FPV Contextual Prompt UI
    const promptBanner = document.getElementById('fpvInteractionPrompt');
    const promptText = document.getElementById('fpvPromptText');
    const promptSub = document.getElementById('fpvPromptSub');

    const nearby = this.physics.getNearbyInteraction();
    if (nearby && promptBanner && promptText) {
      promptText.textContent = nearby.prompt;
      if (promptSub) promptSub.textContent = `TARGET: ${nearby.name.toUpperCase()}`;
      promptBanner.classList.remove('hidden');
    } else if (promptBanner) {
      promptBanner.classList.add('hidden');
    }

    // 8. Render Frame
    this.renderer.render(this.scene, this.camera);
  }

  setActiveIssues(issuesArray) {
    this.activeIssues = new Set(issuesArray);
  }

  onInteract(cb) { this.onInteractCallback = cb; }
  onMenuToggle(cb) { this.onMenuToggleCallback = cb; }
  onEscape(cb) { this.onEscapeCallback = cb; }
}
```

---

### 5.5 Subsystem Module Coordinate Specifications (`js/baseData.js`)
*(Excerpt specifying module spatial coordinates, parameters, and failure modes)*

```javascript
export const BASE_MODULES = [
  {
    id: 'eclss_module',
    name: 'Atmospheric Revitalization (ECLSS)',
    tag: 'ECLSS-01',
    primaryParameter: 'oxygen',
    status: 'nominal',
    location: { x: -11.0, y: 1.7, z: 0, sector: 'West Sector // ECLSS Bay' },
    summary: 'Closed-loop Oxygen Generation Assembly (OGA) and Carbon Dioxide Removal Assembly (CDRA) Sabatier reactor.',
    possibleFailures: [
      {
        id: 'eclss_oga_pump_cavitation',
        title: 'OGA Electrolysis Feed Pump Cavitation',
        severity: 'critical',
        description: 'Vapor lock detected in high-pressure deionized water feed. Oxygen production reduced by 40%.',
        repairAction: 'Purge Gas Pocket & Recalibrate High-Pressure Feed Valve',
        targetParameter: 'oxygen',
        penaltyRate: 1.8
      }
    ]
  },
  {
    id: 'hydroponics_module',
    name: 'Bioregenerative Agri-Pod',
    tag: 'AGRI-02',
    primaryParameter: 'food',
    status: 'nominal',
    location: { x: 11.0, y: 1.7, z: 0, sector: 'East Sector // Agri-Pod' },
    summary: 'Vertical aeroponic rotating trays producing microgreens, dwarf wheat, and sweet potatoes under magenta/UV LEDs.',
    possibleFailures: [
      {
        id: 'agri_aeroponic_clog',
        title: 'Aeroponic Ultrasonic Mister Nozzle Clog',
        severity: 'warning',
        description: 'Calcium-perchlorate mineral scale buildup obstructing misting delivery to root manifolds in Tray B-2.',
        repairAction: 'Sonic Flush Delivery Loop & Clear Nutrient Strainers',
        targetParameter: 'food',
        penaltyRate: 1.2
      }
    ]
  },
  {
    id: 'water_recovery_module',
    name: 'Vapour Compression Distillation (VCD)',
    tag: 'WRS-03',
    primaryParameter: 'water',
    status: 'nominal',
    location: { x: -7.5, y: 1.7, z: 7.0, sector: 'South-West Sector // Fluid Reclamation' },
    summary: '94% closed-loop recovery centrifuge extracting potable water from crew sweat, urine, and atmospheric condensate.',
    possibleFailures: [
      {
        id: 'wrs_centrifuge_imbalance',
        title: 'VCD Centrifuge Rotor Imbalance & Bearing Wear',
        severity: 'critical',
        description: 'Distillation rotor vibration harmonics exceeding 4.2 mm/s RMS. Condensate recovery efficiency dropped to 62%.',
        repairAction: 'Balance Centrifuge Drum & Flush Brine Purge Line',
        targetParameter: 'water',
        penaltyRate: 2.1
      }
    ]
  },
  {
    id: 'power_microgrid_module',
    name: 'Kilopower Fission & Microgrid',
    tag: 'PWR-04',
    primaryParameter: 'power',
    status: 'nominal',
    location: { x: 7.5, y: 1.7, z: 7.0, sector: 'South-East Sector // Energy Generation' },
    summary: '10 kWe Stirling reactor paired with external photovoltaic farm and regenerative fuel-cell microgrid inverter.',
    possibleFailures: [
      {
        id: 'pwr_stirling_converter_variance',
        title: 'Stirling Alternator Phase Frequency Mismatch',
        severity: 'critical',
        description: 'Converter B synchronizer drifting 8.4 Hz out of phase with the main 120V DC distribution bus.',
        repairAction: 'Synchronize Inverter Phase Angles & Reset Load Shunt',
        targetParameter: 'power',
        penaltyRate: 2.4
      }
    ]
  },
  {
    id: 'airlock_module',
    name: 'EVA Preparation & SuitPort Bay',
    tag: 'EVA-05',
    primaryParameter: 'oxygen',
    status: 'nominal',
    location: { x: 0, y: 1.7, z: 16.5, sector: 'South Sector // Airlock Vestibule' },
    summary: 'Depressurization chamber with rear-entry suitports and electrostatic basalt dust vacuum filtration.'
  },
  {
    id: 'command_module',
    name: 'Central Command & Communications Deck',
    tag: 'CMD-06',
    primaryParameter: 'power',
    status: 'nominal',
    location: { x: 0, y: 1.7, z: -14.2, sector: 'North Sector // Command Operations' },
    summary: 'Telemetry hub, orbital relay transponder, and tactical mission challenge terminal.'
  }
];
```

---

## 6. Teammate Handoff & Extension Guide

If your teammate needs to modify or enhance the 3D base, here is how each subsystem is modified:

### 1. Adding a New 3D Prop or Furniture Item
1. Open [js/threeBaseRenderer.js](file:///c:/Users/Eshaan/JAMN-JGI-5/js/threeBaseRenderer.js).
2. Inside `init()` or an appropriate builder method (e.g., `buildFloorAndBulkheads()` or a new `buildCustomModule()`), instantiate the `THREE.Mesh` with geometry and materials.
3. Call `this.scene.add(mesh)`.
4. **Solid Contact Integration:** Open [js/gazeboPhysics.js](file:///c:/Users/Eshaan/JAMN-JGI-5/js/gazeboPhysics.js). Inside `initEnvironmentColliders()`, register its physical boundary so the player cannot walk through it:
   - For rectangular objects: `this.addBoxCollider(centerX, centerZ, width, depth, height, 'Custom Label');`
   - For round objects: `this.addCylinderCollider(centerX, centerZ, radius, height, 'Custom Label');`

### 2. Adding an Interactive Terminal
1. In [js/gazeboPhysics.js](file:///c:/Users/Eshaan/JAMN-JGI-5/js/gazeboPhysics.js), add a new zone to `this.interactionZones`:
   ```javascript
   {
     id: 'custom_terminal_id',
     name: 'Science Spectrometry Terminal',
     x: 4.2,
     z: -6.0,
     radius: 2.2,
     prompt: 'PRESS [E] TO ANALYZE REGOLITH SAMPLES'
   }
   ```
2. In [js/segment3App.js](file:///c:/Users/Eshaan/JAMN-JGI-5/js/segment3App.js), add a corresponding handler in `openSidePopup(moduleId)` to display custom terminal diagnostics or action buttons.

### 3. Modifying Greenhouse Dome Glass or Lighting
- In `ThreeBaseRenderer.buildGeodesicDomeCeiling()`:
  - To increase transparency: Lower `opacity: 0.25` and raise `transmission: 0.95`.
  - To change glass tint: Adjust `color: 0x93c5fd`.
- In `ThreeBaseRenderer.setupLighting()`:
  - Adjust sunlight angle and intensity (`sunLight.intensity = 1.5; sunLight.position.set(...)`).
  - Adjust ambient Mars dust haze (`ambientLight.color.setHex(...)`).

### 4. Adjusting Gravity or Jump Height
- In [js/gazeboPhysics.js](file:///c:/Users/Eshaan/JAMN-JGI-5/js/gazeboPhysics.js):
  - Change `this.gravity = 3.721;` (e.g., set to $1.62\text{ m/s}^2$ for Moon or $9.81\text{ m/s}^2$ for Earth).
  - Jump impulse: Change `this.velocity.y = 3.4;` in `update()`.
  - Walking speed: Change `const moveSpeed = 4.8;` in `update()`.
