import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import eventEmitter from '../utils/eventEmitter';

const POLL_INTERVAL = 1000; // Check every 1 second

export default function GlobalBillManager() {
  const { isAuthenticated } = useAuth();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [isAuthenticated]);

  const startPolling = () => {
    // Initial check
    checkActiveSessions();
    // Set interval
    intervalRef.current = setInterval(checkActiveSessions, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const checkActiveSessions = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Fetch active sessions
      const response = await fetch(`${API_URL}/api/activeTables`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const sessions = await response.json();
      
      const now = new Date();

      sessions.forEach(async (session) => {
        // Only check 'timer' (Countdown/Set Time) sessions
        if (session.booking_type === 'timer' || session.bookingtype === 'timer') {
            const startTime = new Date(session.start_time || session.starttime);
            const duration = parseInt(session.duration_minutes || session.durationminutes || 0);
            
            if (duration > 0) {
                const endTime = new Date(startTime.getTime() + duration * 60000);
                
                // If time has expired (with a small buffer of e.g. 5 seconds to avoid race conditions with UI)
                if (endTime <= now) {
                    console.log(`[GlobalBillManager] Session ${session.active_id || session.activeid} expired. Auto-releasing...`);
                    await autoReleaseSession(session, token);
                }
            }
        }
      });

    } catch (error) {
      console.error('[GlobalBillManager] Error checking sessions:', error);
    }
  };

  const autoReleaseSession = async (session, token) => {
    try {
        const activeId = session.active_id || session.activeid;
        if (!activeId) return;

        const response = await fetch(`${API_URL}/api/activeTables/auto-release`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                active_id: activeId,
                cart_items: [] // No cart items available globally, assumed billed separately or lost if not ordered
            }),
        });

        if (response.ok) {
            console.log(`[GlobalBillManager] Successfully auto-released session ${activeId}`);
            eventEmitter.emit('REFRESH_TABLES');
            // Optional: Notify user via Alert or Toast if needed?
            // "it should automatically genrates the bill" - user implies silent or just handled.
            // Using a non-blocking console log for now.
        } else {
            console.warn(`[GlobalBillManager] Failed to auto-release session ${activeId}:`, response.status);
        }
    } catch (error) {
        console.error(`[GlobalBillManager] Error releasing session:`, error);
    }
  };

  return null; // Render nothing
}
