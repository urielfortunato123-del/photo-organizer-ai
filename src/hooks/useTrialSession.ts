import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TRIAL_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS_PER_DAY = 2;

// Generate a simple device fingerprint
const getDeviceFingerprint = (): string => {
  const nav = navigator;
  const screen = window.screen;
  const fingerprint = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

interface TrialState {
  isTrialActive: boolean;
  remainingTime: number; // in milliseconds
  sessionsUsedToday: number;
  canStartTrial: boolean;
  trialEndTime: number | null;
}

export const useTrialSession = () => {
  const [state, setState] = useState<TrialState>({
    isTrialActive: false,
    remainingTime: TRIAL_DURATION_MS,
    sessionsUsedToday: 0,
    canStartTrial: true,
    trialEndTime: null,
  });

  const deviceFingerprint = getDeviceFingerprint();

  // Check existing trial sessions
  const checkTrialStatus = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('trial_sessions')
        .select('*')
        .eq('device_fingerprint', deviceFingerprint)
        .eq('last_session_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking trial:', error);
        return;
      }

      if (data) {
        const sessionStart = new Date(data.session_start).getTime();
        const now = Date.now();
        const elapsed = now - sessionStart;
        const remaining = Math.max(0, TRIAL_DURATION_MS - elapsed);

        setState({
          isTrialActive: remaining > 0,
          remainingTime: remaining,
          sessionsUsedToday: data.session_count_today,
          canStartTrial: data.session_count_today < MAX_SESSIONS_PER_DAY,
          trialEndTime: remaining > 0 ? sessionStart + TRIAL_DURATION_MS : null,
        });
      } else {
        setState({
          isTrialActive: false,
          remainingTime: TRIAL_DURATION_MS,
          sessionsUsedToday: 0,
          canStartTrial: true,
          trialEndTime: null,
        });
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  }, [deviceFingerprint]);

  // Start a new trial session
  const startTrial = useCallback(async (): Promise<boolean> => {
    if (!state.canStartTrial) {
      return false;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // Check if we already have a session for today
      const { data: existing } = await supabase
        .from('trial_sessions')
        .select('*')
        .eq('device_fingerprint', deviceFingerprint)
        .eq('last_session_date', today)
        .single();

      if (existing) {
        if (existing.session_count_today >= MAX_SESSIONS_PER_DAY) {
          return false;
        }

        // Update existing session
        await supabase
          .from('trial_sessions')
          .update({
            session_start: now,
            session_count_today: existing.session_count_today + 1,
          })
          .eq('id', existing.id);

        setState({
          isTrialActive: true,
          remainingTime: TRIAL_DURATION_MS,
          sessionsUsedToday: existing.session_count_today + 1,
          canStartTrial: existing.session_count_today + 1 < MAX_SESSIONS_PER_DAY,
          trialEndTime: Date.now() + TRIAL_DURATION_MS,
        });
      } else {
        // Create new session
        await supabase
          .from('trial_sessions')
          .insert({
            device_fingerprint: deviceFingerprint,
            session_start: now,
            session_count_today: 1,
            last_session_date: today,
          });

        setState({
          isTrialActive: true,
          remainingTime: TRIAL_DURATION_MS,
          sessionsUsedToday: 1,
          canStartTrial: true,
          trialEndTime: Date.now() + TRIAL_DURATION_MS,
        });
      }

      return true;
    } catch (error) {
      console.error('Error starting trial:', error);
      return false;
    }
  }, [deviceFingerprint, state.canStartTrial]);

  // Update remaining time
  useEffect(() => {
    if (!state.isTrialActive || !state.trialEndTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, state.trialEndTime! - Date.now());
      
      if (remaining <= 0) {
        setState(prev => ({
          ...prev,
          isTrialActive: false,
          remainingTime: 0,
          trialEndTime: null,
        }));
        clearInterval(interval);
      } else {
        setState(prev => ({
          ...prev,
          remainingTime: remaining,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isTrialActive, state.trialEndTime]);

  // Check status on mount
  useEffect(() => {
    checkTrialStatus();
  }, [checkTrialStatus]);

  // Format remaining time
  const formatRemainingTime = (): string => {
    const minutes = Math.floor(state.remainingTime / 60000);
    const seconds = Math.floor((state.remainingTime % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    ...state,
    startTrial,
    checkTrialStatus,
    formatRemainingTime,
    maxSessionsPerDay: MAX_SESSIONS_PER_DAY,
  };
};
