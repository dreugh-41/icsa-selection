// src/components/Notification.jsx
import React, { useState, useEffect } from 'react';
import realTimeService from '../utils/services/realTimeService';
import { EVENT_PHASES } from '../contexts/EventContext';

function Notification() {
  const [notifications, setNotifications] = useState([]);
  
  // Helper function to get a readable phase name
  const getPhaseDisplay = (phase) => {
    const displays = {
      [EVENT_PHASES.PRESELECTION]: 'Preselection Phase',
      [EVENT_PHASES.ROUND1_AQ]: 'Round 1 - Automatic Qualifier Selection',
      [EVENT_PHASES.ROUND1_LOCK]: 'Round 1 - Lock Vote Submission',
      [EVENT_PHASES.ROUND1_FINALIZED]: 'Round 1 Complete',
      [EVENT_PHASES.ROUND_LEFTOVER]: 'Leftover Team Voting',
      [EVENT_PHASES.ROUND_RANKING]: 'Team Ranking Phase',
      [EVENT_PHASES.ROUND_FINALIZED]: 'Round Complete'
    };
    return displays[phase] || phase;
  };
  
  useEffect(() => {
    // Subscribe to phase changes
    const phaseSubscription = realTimeService.subscribe('phase_changed', data => {
      const notification = {
        id: Date.now(),
        type: 'info',
        message: `Process phase changed from "${getPhaseDisplay(data.oldPhase)}" to "${getPhaseDisplay(data.newPhase)}"`,
        time: new Date()
      };
      setNotifications(prev => [...prev, notification]);
    });
    
    // Subscribe to team qualification
    const teamsSubscription = realTimeService.subscribe('teams_qualified', data => {
      const notification = {
        id: Date.now(),
        type: 'success',
        message: `${data.newlyQualified.length} new teams have qualified! Total qualified: ${data.totalQualified}`,
        time: new Date()
      };
      setNotifications(prev => [...prev, notification]);
    });
    
    // Clean up subscriptions on unmount
    return () => {
      phaseSubscription();
      teamsSubscription();
    };
  }, []);
  
  // Remove a notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => {
          const [, ...rest] = prev;
          return rest;
        });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notifications]);
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg flex items-start max-w-md ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' :
            notification.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}
        >
          <div className="flex-grow">
            <p className="font-medium">{notification.message}</p>
            <p className="text-xs mt-1">
              {notification.time.toLocaleTimeString()}
            </p>
          </div>
          <button 
            onClick={() => removeNotification(notification.id)}
            className="ml-2 text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export default Notification;