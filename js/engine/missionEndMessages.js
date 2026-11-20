/**
 * Terminal Mission End Messages
 * Segment 6 — Game Ending (Success & Failure Messages)
 * 
 * Research standard: NASA, NASA/JPL life-support criteria.
 * Exact copy specified in Segment 5/6 document (§9 & §10).
 */

export const MISSION_FAILURE_MESSAGES = {
  oxygen_depleted: {
    key: "oxygen_depleted",
    resource: "oxygen",
    heading: "OXYGEN RESERVE DEPLETED",
    badge: "Life Support Failure",
    icon: "💨",
    getMessage: (day) =>
      `The habitat's breathable oxygen reserve has been exhausted. The crew depends on a controlled oxygen supply to breathe, while the ECLSS must continuously replace the oxygen being consumed and manage carbon dioxide. With the reserve at zero and oxygen generation unable to keep pace, the atmosphere can no longer support the crew. The mission has been terminated on Sol ${day}.`
  },
  food_depleted: {
    key: "food_depleted",
    resource: "food",
    heading: "FOOD RESERVES EXHAUSTED",
    badge: "Caloric Supply Failure",
    icon: "🌾",
    getMessage: (day) =>
      `The stored food reserve and available crop production have been exhausted. The crew can no longer meet its required food supply for continued operations. Hydroponics can supplement stored provisions, but the habitat cannot rely on an unavailable harvest to replace the food that has run out. The mission has been terminated on Sol ${day}.`
  },
  water_depleted: {
    key: "water_depleted",
    resource: "water",
    heading: "WATER RESERVE DEPLETED",
    badge: "Hydrologic Loop Failure",
    icon: "💧",
    getMessage: (day) =>
      `The habitat's usable make-up-water reserve has reached zero. Water recovery can recycle much of the water already in the loop, but it cannot eliminate every loss or replace a failed extraction supply. Without enough make-up water, the crew's drinking and hygiene supply, oxygen-generation feed, and crop irrigation cannot be sustained. The mission has been terminated on Sol ${day}.`
  },
  power_depleted: {
    key: "power_depleted",
    resource: "power",
    heading: "POWER GRID BLACKOUT",
    badge: "Total Electrical Blackout",
    icon: "⚡",
    getMessage: (day) =>
      `The base has lost all available electrical power, and the emergency response window has expired without recovery. The blackout disables essential systems that keep the habitat operating, including atmospheric revitalisation, water recovery and extraction, heating, and crop lighting. Without power, the other life-support systems cannot be sustained. The mission has been terminated on Sol ${day}.`
  }
};

export const MISSION_SUCCESS_MESSAGES = {
  full_handover: {
    key: "full_handover",
    heading: "MISSION SUCCESS — BASE READY FOR HANDOVER",
    badge: "Certified Handover Ready",
    icon: "🪐",
    statusClass: "success-full",
    getMessage: () =>
      `All 30 sols are complete. The crew maintained the habitat, protected its life-support systems, and finished the mission with Oxygen, Food, Water, and Power above the required handover reserve. Critical systems are stable, and the base is ready for the next astronaut team. Excellent work, Commander.`
  },
  marginal_handover: {
    key: "marginal_handover",
    heading: "MISSION COMPLETED — HANDOVER NEEDS ATTENTION",
    badge: "Handover Needs Attention",
    icon: "🛠️",
    statusClass: "success-marginal",
    getMessage: () =>
      `The crew has survived all 30 sols and completed the mission. However, one or more resource reserves are below the 25% handover target, or a maintenance issue remains unresolved. The outpost has survived, but it needs replenishment and inspection before the next astronaut team arrives. Mission complete — handover condition: marginal.`
  }
};

export function getTerminalMessage(status, endReason, day) {
  if (status === 'failure') {
    const reasonKey = endReason || 'oxygen_depleted';
    const msgDef = MISSION_FAILURE_MESSAGES[reasonKey] || MISSION_FAILURE_MESSAGES.oxygen_depleted;
    return {
      status: 'failure',
      heading: msgDef.heading,
      badge: msgDef.badge,
      icon: msgDef.icon,
      body: msgDef.getMessage(day || 1),
      isSuccess: false
    };
  }

  // Success variants
  const isFull = (endReason === 'full_handover' || endReason === 'Certified Handover Ready');
  const msgDef = isFull ? MISSION_SUCCESS_MESSAGES.full_handover : MISSION_SUCCESS_MESSAGES.marginal_handover;
  return {
    status: 'success',
    heading: msgDef.heading,
    badge: msgDef.badge,
    icon: msgDef.icon,
    body: msgDef.getMessage(),
    isSuccess: true
  };
}
