import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const TRIAL_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS_PER_DAY = 2;
const MAX_SESSIONS_PER_WEEK = 4;

interface TrialState {
  isTrialActive: boolean;
  remainingTime: number;
  sessionsUsedToday: number;
  sessionsUsedThisWeek: number;
  canStartTrial: boolean;
  trialEndTime: number | null;
}

export const useTrialSession = () => {
  const { user } = useAuth();
  const [state, setState] = useState<TrialState>({
    isTrialActive: false,
    remainingTime: TRIAL_DURATION_MS,
    sessionsUsedToday: 0,
    sessionsUsedThisWeek: 0,
    canStartTrial: false,
    trialEndTime: null,
  });

  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  };

  const checkTrialStatus = useCallback(async () => {
    if (!user) {
      setState({
        isTrialActive: false,
        remainingTime: TRIAL_DURATION_MS,
        sessionsUsedToday: 0,
        sessionsUsedThisWeek: 0,
        canStartTrial: false,
        trialEndTime: null,
      });
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = getWeekStart();

      const { data, error } = await supabase
        .from('trial_sessions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking trial:', error);
        return;
      }

      if (data) {
        let sessionsToday = data.session_count_today;
        let sessionsWeek = data.session_count_week;

        // Reset daily count if it's a new day
        if (data.last_session_date !== today) {
          sessionsToday = 0;
        }

        // Reset weekly count if it's a new week
        if (data.week_start_date !== weekStart) {
          sessionsWeek = 0;
        }

        const sessionStart = new Date(data.session_start).getTime();
        const now = Date.now();
        const elapsed = now - sessionStart;
        const remaining = Math.max(0, TRIAL_DURATION_MS - elapsed);

        const canStart = sessionsToday < MAX_SESSIONS_PER_DAY && sessionsWeek < MAX_SESSIONS_PER_WEEK;

        setState({
          isTrialActive: remaining > 0 && data.last_session_date === today,
          remainingTime: remaining > 0 ? remaining : TRIAL_DURATION_MS,
          sessionsUsedToday: sessionsToday,
          sessionsUsedThisWeek: sessionsWeek,
          canStartTrial: canStart,
          trialEndTime: remaining > 0 && data.last_session_date === today ? sessionStart + TRIAL_DURATION_MS : null,
        });
      } else {
        setState({
          isTrialActive: false,
          remainingTime: TRIAL_DURATION_MS,
          sessionsUsedToday: 0,
          sessionsUsedThisWeek: 0,
          canStartTrial: true,
          trialEndTime: null,
        });
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  }, [user]);

  const startTrial = useCallback(async (): Promise<boolean> => {
    if (!user || !state.canStartTrial) {
      return false;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = getWeekStart();
      const now = new Date().toISOString();

      const { data: existing } = await supabase
        .from('trial_sessions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        let newDayCount = existing.session_count_today;
        let newWeekCount = existing.session_count_week;

        // Reset daily count if new day
        if (existing.last_session_date !== today) {
          newDayCount = 0;
        }

        // Reset weekly count if new week
        if (existing.week_start_date !== weekStart) {
          newWeekCount = 0;
        }

        if (newDayCount >= MAX_SESSIONS_PER_DAY || newWeekCount >= MAX_SESSIONS_PER_WEEK) {
          return false;
        }

        await supabase
          .from('trial_sessions')
          .update({
            session_start: now,
            session_count_today: newDayCount + 1,
            session_count_week: newWeekCount + 1,
            last_session_date: today,
            week_start_date: weekStart,
          })
          .eq('user_id', user.id);

        setState({
          isTrialActive: true,
          remainingTime: TRIAL_DURATION_MS,
          sessionsUsedToday: newDayCount + 1,
          sessionsUsedThisWeek: newWeekCount + 1,
          canStartTrial: newDayCount + 1 < MAX_SESSIONS_PER_DAY && newWeekCount + 1 < MAX_SESSIONS_PER_WEEK,
          trialEndTime: Date.now() + TRIAL_DURATION_MS,
        });
      } else {
        await supabase
          .from('trial_sessions')
          .insert({
            user_id: user.id,
            session_start: now,
            session_count_today: 1,
            session_count_week: 1,
            last_session_date: today,
            week_start_date: weekStart,
          });

        setState({
          isTrialActive: true,
          remainingTime: TRIAL_DURATION_MS,
          sessionsUsedToday: 1,
          sessionsUsedThisWeek: 1,
          canStartTrial: true,
          trialEndTime: Date.now() + TRIAL_DURATION_MS,
        });
      }

      return true;
    } catch (error) {
      console.error('Error starting trial:', error);
      return false;
    }
  }, [user, state.canStartTrial]);

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

  // Check status when user changes
  useEffect(() => {
    checkTrialStatus();
  }, [checkTrialStatus]);

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
    maxSessionsPerWeek: MAX_SESSIONS_PER_WEEK,
  };
};
