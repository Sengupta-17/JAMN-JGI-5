/**
 * Mars Field Notes Dataset & Source Registry
 * Segment 5 — Mars Field Notes & Mission End Messages
 * 
 * Standard: NASA, NASA/JPL, NASA NTRS, USGS.
 * Strictly 30 entries mapped 1:1 to Sols 01 through 30.
 */

export const MARS_SOURCES = {
  S01: {
    id: "S01",
    name: "NASA/JPL — Mars at a Glance (InSight press kit)",
    url: "https://www.jpl.nasa.gov/news/press_kits/insight/launch/facts/mars-at-a-glance/"
  },
  S02: {
    id: "S02",
    name: "NASA Science — Mars: Facts",
    url: "https://science.nasa.gov/mars/facts/"
  },
  S03: {
    id: "S03",
    name: "NASA Science — Seasons on Earth, Mars, and Beyond",
    url: "https://science.nasa.gov/helio-and-you-seasons-on-earth-mars-and-beyond/"
  },
  S04: {
    id: "S04",
    name: "NASA Science — Temperatures Across Our Solar System",
    url: "https://science.nasa.gov/solar-system/temperatures-across-our-solar-system/"
  },
  S05: {
    id: "S05",
    name: "NASA — To Great Depths: Hellas",
    url: "https://www.nasa.gov/image-article/great-depths/"
  },
  S06: {
    id: "S06",
    name: "USGS — Geologic Map of Part of the Western Hellas Planitia, Mars",
    url: "https://pubs.usgs.gov/publication/sim2953"
  },
  S07: {
    id: "S07",
    name: "NASA Science — Frozen: Ice on Earth and Well Beyond",
    url: "https://science.nasa.gov/earth/frozen-ice-on-earth-and-well-beyond/"
  },
  S08: {
    id: "S08",
    name: "NASA/JPL — Spacecraft Sees Ice on Mars Exposed by Meteor Impacts",
    url: "https://www.jpl.nasa.gov/news/nasa-spacecraft-sees-ice-on-mars-exposed-by-meteor-impacts/"
  },
  S09: {
    id: "S09",
    name: "NASA NTRS — Perchlorate on Mars: Overview and Implications (PDF)",
    url: "https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20190028297.pdf"
  },
  S10: {
    id: "S10",
    name: "NASA Science — Mars Phoenix Mission",
    url: "https://science.nasa.gov/mission/mars-phoenix/"
  },
  S11: {
    id: "S11",
    name: "NASA Science — Perseverance View of the Delta in Jezero Crater",
    url: "https://science.nasa.gov/resource/perseverance-view-of-the-delta-in-jezero-crater/"
  },
  S12: {
    id: "S12",
    name: "NASA Science — What Do Sunrises and Sunsets Look Like on Mars?",
    url: "https://science.nasa.gov/solar-system/planets/mars/what-does-a-sunrise-sunset-look-like-on-mars/"
  },
  S13: {
    id: "S13",
    name: "NASA Science — Curiosity Views First Martian “Sun Rays”",
    url: "https://science.nasa.gov/resource/curiosity-views-first-martian-sun-rays/"
  },
  S14: {
    id: "S14",
    name: "NASA NTRS — The Mars Global Dust Storm of 2018 (PDF)",
    url: "https://ntrs.nasa.gov/api/citations/20190027303/downloads/20190027303.pdf"
  },
  S15: {
    id: "S15",
    name: "NASA Science — The Martian Dust Storm of June 2018",
    url: "https://science.nasa.gov/resource/the-martian-dust-storm-of-june-2018/"
  },
  S16: {
    id: "S16",
    name: "NASA Science — Opportunity Rover Mission",
    url: "https://science.nasa.gov/mission/mer-opportunity/"
  },
  S17: {
    id: "S17",
    name: "NASA — Martian Dust Could Help Explain Water Loss, Plus Other Learnings From Global Storm",
    url: "https://www.nasa.gov/missions/martian-dust-could-help-explain-water-loss-plus-other-learnings-from-global-storm/"
  },
  S18: {
    id: "S18",
    name: "NASA Science — Radiation Measurements on Mars",
    url: "https://science.nasa.gov/resource/radiation-measurements-on-mars/"
  },
  S19: {
    id: "S19",
    name: "NASA Science — Mars Global Surveyor: Science Highlights",
    url: "https://science.nasa.gov/mission/mars-global-surveyor/science-highlights/"
  },
  S20: {
    id: "S20",
    name: "NASA — MAVEN Reveals Most of Mars' Atmosphere Was Lost to Space",
    url: "https://www.nasa.gov/news-release/nasas-maven-reveals-most-of-mars-atmosphere-was-lost-to-space/"
  },
  S21: {
    id: "S21",
    name: "NASA Science — MAVEN Illuminates New Understanding of Auroras at Mars",
    url: "https://science.nasa.gov/missions/maven/nasas-maven-illuminates-new-understanding-of-auroras-at-mars/"
  },
  S22: {
    id: "S22",
    name: "NASA Science — Mars Moons: Facts",
    url: "https://science.nasa.gov/mars/moons/facts/"
  },
  S23: {
    id: "S23",
    name: "NASA Science — Perseverance Rover's Entry, Descent, and Landing Profile",
    url: "https://science.nasa.gov/resource/perseverance-rovers-entry-descent-and-landing-profile/"
  },
  S24: {
    id: "S24",
    name: "NASA Science — The Sound of MOXIE at Work on Mars",
    url: "https://science.nasa.gov/resource/the-sound-of-moxie-at-work-on-mars/"
  }
};

export const MARS_FIELD_NOTES = [
  {
    sol: 1,
    title: "A Martian day is a little longer",
    body: "A Martian solar day, called a sol, lasts about 24 hours, 39 minutes, and 35 seconds on Earth clocks. That extra 39 minutes adds up over a mission, which is why Mars mission teams use sols to plan daily operations.",
    sourceIds: ["S01"],
    sourceLabel: "NASA / JPL",
    sourceUrl: MARS_SOURCES.S01.url
  },
  {
    sol: 2,
    title: "A Martian year lasts almost two Earth years",
    body: "Mars takes about 687 Earth days to orbit the Sun, or roughly 669 Martian sols. A 30-sol training mission is therefore only a small portion of a real Martian year.",
    sourceIds: ["S01", "S03"],
    sourceLabel: "NASA / JPL",
    sourceUrl: MARS_SOURCES.S01.url
  },
  {
    sol: 3,
    title: "Mars has seasons, but they are not equal in length",
    body: "Mars has an axial tilt of about 25 degrees, close to Earth's, so it experiences spring, summer, autumn, and winter. Its more elliptical orbit makes the seasons different lengths; northern spring is much longer than northern autumn.",
    sourceIds: ["S03"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S03.url
  },
  {
    sol: 4,
    title: "The Martian air is mostly carbon dioxide",
    body: "Mars' atmosphere is approximately 95.3% carbon dioxide, with nitrogen and argon making up most of the remainder. It is not breathable air, but its CO₂ is a possible feedstock for technologies that make oxygen.",
    sourceIds: ["S01", "S23"],
    sourceLabel: "NASA / JPL",
    sourceUrl: MARS_SOURCES.S01.url
  },
  {
    sol: 5,
    title: "Surface pressure is extremely low",
    body: "The average surface pressure on Mars is less than one-hundredth of Earth's average sea-level pressure. A habitat therefore needs a sealed, pressurised interior; the thin outside atmosphere cannot support an unprotected human.",
    sourceIds: ["S01", "S02"],
    sourceLabel: "NASA / JPL",
    sourceUrl: MARS_SOURCES.S01.url
  },
  {
    sol: 6,
    title: "Mars can be both warmer and colder than you might expect",
    body: "NASA reports Martian surface temperatures ranging from around 20°C in some warm conditions to about −153°C in the coldest conditions. The thin atmosphere stores little heat, so local temperatures can change sharply between day and night.",
    sourceIds: ["S04", "S02"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S04.url
  },
  {
    sol: 7,
    title: "You would weigh much less on Mars",
    body: "Mars' surface gravity is about 38% of Earth's. A person with a mass of 100 kg would still have 100 kg of mass, but their weight on Mars would be roughly equivalent to 38 kg-force on an Earth scale.",
    sourceIds: ["S01"],
    sourceLabel: "NASA / JPL",
    sourceUrl: MARS_SOURCES.S01.url
  },
  {
    sol: 8,
    title: "The Red Planet is rusty",
    body: "Mars looks red mainly because iron-bearing minerals in its rocks, regolith, and dust have oxidised. Wind lifts some of this fine rusty material into the atmosphere, helping give the planet its familiar colour from space.",
    sourceIds: ["S02"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S02.url
  },
  {
    sol: 9,
    title: "Mars has almost as much land area as Earth",
    body: "Mars is only about half Earth's diameter, yet its total surface area is nearly the same as Earth's dry land area. Earth is larger overall, but much of its surface is covered by oceans.",
    sourceIds: ["S02"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S02.url
  },
  {
    sol: 10,
    title: "Olympus Mons is the solar system's giant volcano",
    body: "Olympus Mons, at the Tharsis region, is the largest known volcano in the solar system. NASA describes it as more than 25 miles (about 40 km) from base to summit, with a footprint comparable to the U.S. state of Arizona.",
    sourceIds: ["S02"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S02.url
  },
  {
    sol: 11,
    title: "Valles Marineris dwarfs the Grand Canyon",
    body: "Valles Marineris stretches about 3,870 km across Mars, is up to about 600 km wide, and reaches roughly 9.3 km from rim to floor in its deepest areas. It is the largest canyon system known in the solar system.",
    sourceIds: ["S02"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S02.url
  },
  {
    sol: 12,
    title: "Hellas is a colossal impact basin",
    body: "Hellas Planitia lies inside an ancient impact basin about 2,300 km wide. Its floor contains some of the lowest elevations on Mars, making it a dramatically deep region of the planet.",
    sourceIds: ["S05", "S06"],
    sourceLabel: "NASA / USGS",
    sourceUrl: MARS_SOURCES.S05.url
  },
  {
    sol: 13,
    title: "The polar caps change with the seasons",
    body: "Mars' polar regions gain and lose seasonal carbon-dioxide frost and ice as the seasons change. During northern summer, the remaining north polar cap is predominantly water ice; the seasonal CO₂ cover retreats.",
    sourceIds: ["S07"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S07.url
  },
  {
    sol: 14,
    title: "Water ice is not limited to the poles",
    body: "NASA's Mars Reconnaissance Orbiter has spotted water ice exposed by fresh meteorite craters at several mid-latitude locations. Some of the newly exposed ice was only about 0.5–2.5 metres below the surface before the impact uncovered it.",
    sourceIds: ["S08"],
    sourceLabel: "NASA / JPL",
    sourceUrl: MARS_SOURCES.S08.url
  },
  {
    sol: 15,
    title: "Phoenix found a chemical called perchlorate",
    body: "NASA's Phoenix lander detected perchlorate salts in soil at its northern plains landing site. A NASA technical review reports the initial Phoenix detection at about 0.5% by weight in the sampled soil; future explorers would need to account for such salts when processing local soil or water.",
    sourceIds: ["S09", "S10"],
    sourceLabel: "NASA NTRS / Science",
    sourceUrl: MARS_SOURCES.S09.url
  },
  {
    sol: 16,
    title: "Ancient Mars had rivers, lakes, and floods",
    body: "Mars' surface preserves ancient river-valley networks, deltas, and lakebeds. Some geological features suggest that enormous floods may have occurred about 3.5 billion years ago, when Mars had a very different climate.",
    sourceIds: ["S02"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S02.url
  },
  {
    sol: 17,
    title: "Perseverance landed beside an ancient river delta",
    body: "NASA's Perseverance rover landed in Jezero Crater, where a fan-shaped sediment deposit is interpreted as the remnant of a river delta that flowed into an ancient lake. Deltas can concentrate and preserve materials useful in the search for signs of ancient microbial life.",
    sourceIds: ["S11"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S11.url
  },
  {
    sol: 18,
    title: "Liquid water does not last long on the modern surface",
    body: "Mars has water today, but its cold temperatures and very thin atmosphere make liquid water unstable at the surface for long periods. Much of the known present-day water is found as ice, including near-surface deposits.",
    sourceIds: ["S02", "S08"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S02.url
  },
  {
    sol: 19,
    title: "Martian sunsets can look blue",
    body: "Unlike Earth's familiar red-orange sunsets, Mars can show a bluish glow close to the setting Sun. Fine airborne dust scatters blue light differently from other colours, keeping the blue tones concentrated near the Sun while much of the surrounding sky appears yellow or orange.",
    sourceIds: ["S12"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S12.url
  },
  {
    sol: 20,
    title: "Some Martian clouds are made of water ice or dry ice",
    body: "Many clouds observed by Mars rovers are made of water-ice crystals. Curiosity has also imaged very high clouds that may be made of frozen carbon dioxide — dry ice — rather than water ice.",
    sourceIds: ["S13"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S13.url
  },
  {
    sol: 21,
    title: "Dust storms can affect the whole planet",
    body: "Mars experiences local, regional, and sometimes planet-encircling dust storms. After major storms, airborne dust can take weeks or months to settle back out, so reduced visibility and sunlight can persist after the strongest winds have passed.",
    sourceIds: ["S02", "S14"],
    sourceLabel: "NASA NTRS / Science",
    sourceUrl: MARS_SOURCES.S02.url
  },
  {
    sol: 22,
    title: "A global dust storm helped end Opportunity's mission",
    body: "In 2018, a planet-encircling dust storm blocked sunlight from reaching NASA's solar-powered Opportunity rover. The dust opacity measured at Opportunity's location rose above 10.7, and the rover stopped communicating; NASA ended the mission after recovery attempts failed.",
    sourceIds: ["S15", "S16"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S15.url
  },
  {
    sol: 23,
    title: "Dust devils can help clean solar panels",
    body: "Martian dust devils are rotating columns of air and dust. When one passes over a solar-powered lander or rover, it can remove some accumulated dust from its panels; however, dust devils may become scarce during a major dust storm and for a period afterward.",
    sourceIds: ["S17"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S17.url
  },
  {
    sol: 24,
    title: "Curiosity measured radiation on the Martian surface",
    body: "Curiosity's Radiation Assessment Detector (RAD) measured a slowly varying contribution of about 210 microgray per day from galactic cosmic rays during its initial surface-observation period. This is an absorbed-dose measurement, not a universal fixed value for every location or a direct prediction for every future crew mission.",
    sourceIds: ["S18"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S18.url
  },
  {
    sol: 25,
    title: "Mars has no global magnetic field today",
    body: "Mars does not have a planet-wide magnetic field like Earth's. However, parts of its crust preserve strong, localised magnetic signatures — remnants of an older magnetic field from early Mars.",
    sourceIds: ["S19"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S19.url
  },
  {
    sol: 26,
    title: "Mars has lost much of its ancient atmosphere to space",
    body: "NASA's MAVEN mission studies how the solar wind interacts with Mars' upper atmosphere. One MAVEN analysis estimated that about 65% of the argon that was ever in the atmosphere has escaped to space, helping scientists reconstruct how Mars changed from a wetter world into today's cold desert.",
    sourceIds: ["S20"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S20.url
  },
  {
    sol: 27,
    title: "Mars has auroras, too",
    body: "NASA's MAVEN mission has observed auroras on Mars. Unlike Earth's familiar polar displays, Martian auroras can be localised around regions where ancient crustal magnetic fields interact with charged particles from space.",
    sourceIds: ["S21"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S21.url
  },
  {
    sol: 28,
    title: "Mars' two moons move very differently",
    body: "Mars has two small moons: Phobos and Deimos. Phobos is much closer and circles Mars about three times per Martian day; Deimos takes about 30 hours to complete an orbit. Phobos is slowly spiralling inward.",
    sourceIds: ["S22"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S22.url
  },
  {
    sol: 29,
    title: "Landing on Mars is a race against a radio delay",
    body: "A rover's entry, descent, and landing sequence takes roughly seven minutes, while a radio signal from Mars takes longer than that to reach Earth. Mission control cannot joystick a rover through touchdown in real time, so the spacecraft must execute the critical landing sequence autonomously. Perseverance used a rocket-powered sky crane to lower itself to the surface on cables.",
    sourceIds: ["S23"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S23.url
  },
  {
    sol: 30,
    title: "MOXIE made oxygen from Martian air",
    body: "NASA's MOXIE experiment on Perseverance extracted oxygen from Mars' CO₂-rich atmosphere. It produced 122 grams in total and reached a peak rate of 12 grams per hour at 98% purity or better — a major technology demonstration, not a full-scale oxygen plant for a crewed habitat.",
    sourceIds: ["S24"],
    sourceLabel: "NASA Science",
    sourceUrl: MARS_SOURCES.S24.url
  }
];

export function getMarsFieldNote(solNumber) {
  const sol = Math.max(1, Math.min(30, parseInt(solNumber, 10) || 1));
  return MARS_FIELD_NOTES[sol - 1];
}
