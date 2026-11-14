/**
 * Junior Astronaut Mission Trainer - Segment 3 Shared Contract Interface
 * 
 * Provides type definitions, event constants, and communication hooks for:
 * - Segment 2 (Home Page & Site Selection) -> Segment 3 (Base Entry)
 * - Segment 3 (Base Navigation & Challenge) -> Segment 4 (Game Engine)
 * - Segment 4 (Game Engine) -> Segment 3 (Base Navigation / Repair)
 */

export const EVENTS = {
  SITE_SELECTED: 'siteSelected',             // Seg 2 -> Seg 3
  CHALLENGE_SELECTED: 'challengeSelected',   // Seg 3 -> Seg 4
  BASE_ISSUE_RAISED: 'baseIssueRaised',     // Seg 4 -> Seg 3
  BASE_ISSUE_FIXED: 'baseIssueFixed',       // Seg 3 -> Seg 4
  RETRY_REQUESTED: 'retryRequested'          // Seg 6 -> Seg 3/4
};

/**
 * Notify Segment 3 that a site has been chosen.
 * @param {'north_polar'|'olympus_mons'|'valles_marineris'|'hellas_basin'} siteId 
 */
export function sendSiteSelected(siteId) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTS.SITE_SELECTED, { detail: { siteId } }));
  }
}

/**
 * Trigger an active malfunction in a base module during the game.
 * @param {'eclss_module'|'hydroponics_module'|'water_recovery_module'|'power_microgrid_module'|'airlock_module'|'command_module'|'habitation_module'} locationId
 * @param {Object} [issueDetails]
 */
export function sendBaseIssueRaised(locationId, issueDetails = null) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTS.BASE_ISSUE_RAISED, { detail: { locationId, issueDetails } }));
  }
}

/**
 * Listen for when the astronaut fixes a base issue via navigation.
 * @param {(payload: { locationId: string, fixedAt: number }) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function onBaseIssueFixed(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail);
  window.addEventListener(EVENTS.BASE_ISSUE_FIXED, handler);
  return () => window.removeEventListener(EVENTS.BASE_ISSUE_FIXED, handler);
}

/**
 * Listen for when the astronaut confirms challenge selection to start the game.
 * @param {(payload: { siteId: string, challengeType: string, startingParameters: Object }) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function onChallengeSelected(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail);
  window.addEventListener(EVENTS.CHALLENGE_SELECTED, handler);
  return () => window.removeEventListener(EVENTS.CHALLENGE_SELECTED, handler);
}
