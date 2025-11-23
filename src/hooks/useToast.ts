import { useState } from 'react';

interface ToastState {
  message: string;
  isVisible: boolean;
  type: 'success' | 'progress' | 'achievement';
  position: 'default' | 'center';
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    isVisible: false,
    type: 'success',
    position: 'default'
  });

  const showToast = (hoursStudied: number, dailyTarget: number = 6, position: 'default' | 'center' = 'default') => {
    let message = '';
    let type: 'success' | 'progress' | 'achievement' = 'success';

    if (hoursStudied < 4) {
      message = `You've studied ${hoursStudied.toFixed(1)} hours today. Keep building your learning momentum!`;
      type = 'success';
    } else if (hoursStudied < dailyTarget) {
      const percentage = ((hoursStudied / dailyTarget) * 100).toFixed(0);
      message = `${hoursStudied.toFixed(1)} hours completed (${percentage}% of target). You're making excellent progress!`;
      type = 'progress';
    } else {
      message = `Daily goal achieved with ${hoursStudied.toFixed(1)} hours! Outstanding dedication and focus.`;
      type = 'achievement';
    }

    setToast({
      message,
      isVisible: true,
      type,
      position
    });
  };

  const hideToast = () => {
    setToast(prev => ({
      ...prev,
      isVisible: false,
      position: 'default'
    }));
  };

  return {
    toast,
    showToast,
    hideToast
  };
};