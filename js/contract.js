/**
 * Shared Contract Event Bus for Junior Astronaut Mission Trainer
 * Implements Section 1.4 Shared Events:
 * - siteSelected(siteId) (Segment 2 -> Segment 3)
 * - challengeSelected(siteId, challengeType) (Segment 3 -> Segment 4)
 * - baseIssueRaised(locationId) (Segment 4 -> Segment 3)
 * - baseIssueFixed(locationId) (Segment 3 -> Segment 4)
 */

class SegmentContractBus {
  constructor() {
    this.listeners = new Map();
    this.channel = null;

    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this.channel = new BroadcastChannel('jamn_mission_trainer_bus');
        this.channel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type) {
            this.notify(type, payload, false);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not accessible:', e);
      }
    }
  }

  on(eventType, handler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(handler);
    return () => this.off(eventType, handler);
  }

  off(eventType, handler) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(handler);
    }
  }

  emit(eventType, payload = {}) {
    this.notify(eventType, payload, true);
  }

  notify(eventType, payload, broadcast = true) {
    // Notify local in-memory listeners
    if (this.listeners.has(eventType)) {
      for (const handler of this.listeners.get(eventType)) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`Error in event listener for ${eventType}:`, err);
        }
      }
    }

    // Dispatch DOM CustomEvent for external DOM scripts
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventType, { detail: payload }));
      window.dispatchEvent(new CustomEvent('jamn_event', { detail: { type: eventType, payload } }));
    }

    // Broadcast cross-tab/cross-iframe via BroadcastChannel
    if (broadcast && this.channel) {
      try {
        this.channel.postMessage({ type: eventType, payload, timestamp: Date.now() });
      } catch (err) {
        console.warn('Failed to broadcast event:', err);
      }
    }
  }
}

export const contractBus = new SegmentContractBus();
