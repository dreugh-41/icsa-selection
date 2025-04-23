// src/utils/services/realTimeService.js
class RealTimeService {
    constructor() {
      this.subscribers = {};
      this.lastEventState = null;
      this.pollingInterval = null;
      this.pollingDelay = 3000; // Check for updates every 3 seconds
    }
  
    // Subscribe to updates for a specific event
    subscribe(eventType, callback) {
      if (!this.subscribers[eventType]) {
        this.subscribers[eventType] = [];
      }
      
      this.subscribers[eventType].push(callback);
      
      // Return unsubscribe function
      return () => {
        this.subscribers[eventType] = this.subscribers[eventType].filter(cb => cb !== callback);
      };
    }
  
    // Publish an event to all subscribers
    publish(eventType, data) {
      if (!this.subscribers[eventType]) return;
      
      this.subscribers[eventType].forEach(callback => {
        callback(data);
      });
    }
  
    // Start polling for changes to event state
    startPolling(getEventStateFn) {
      // Clear any existing interval
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }
      
      // Set initial state
      this.lastEventState = JSON.stringify(getEventStateFn());
      
      // Start checking for changes
      this.pollingInterval = setInterval(() => {
        const currentState = JSON.stringify(getEventStateFn());
        
        // If state has changed, notify subscribers
        if (currentState !== this.lastEventState) {
          const oldState = JSON.parse(this.lastEventState);
          const newState = JSON.parse(currentState);
          
          // Update last known state
          this.lastEventState = currentState;
          
          // Detect specific changes
          if (oldState.phase !== newState.phase) {
            this.publish('phase_changed', {
              oldPhase: oldState.phase,
              newPhase: newState.phase
            });
          }
          
          if (oldState.qualifiedTeams?.length !== newState.qualifiedTeams?.length) {
            this.publish('teams_qualified', {
              newlyQualified: newState.qualifiedTeams.slice(oldState.qualifiedTeams.length),
              totalQualified: newState.qualifiedTeams.length
            });
          }
          
          if (JSON.stringify(oldState.rankingGroup) !== JSON.stringify(newState.rankingGroup)) {
            this.publish('ranking_group_updated', {
              rankingGroup: newState.rankingGroup
            });
          }
          
          // General update event
          this.publish('state_updated', {
            oldState,
            newState
          });
        }
      }, this.pollingDelay);
    }

    startLocalStoragePolling() {
      // Check every 3 seconds
      setInterval(() => {
        try {
          // Check for changes in localStorage
          const eventStateStr = localStorage.getItem('sailing_nationals_event_state');
          
          if (eventStateStr && this.lastEventState !== eventStateStr) {
            const oldState = this.lastEventState ? JSON.parse(this.lastEventState) : {};
            const newState = JSON.parse(eventStateStr);
            
            // Update stored state
            this.lastEventState = eventStateStr;
            
            // Trigger update event
            this.publish('state_updated', {
              oldState,
              newState
            });
          }
        } catch (error) {
          console.error("Error in localStorage polling:", error);
        }
      }, 3000);
    }
  
    // Stop polling
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    }
  }
  
  // Create singleton instance
  const realTimeService = new RealTimeService();
  export default realTimeService;