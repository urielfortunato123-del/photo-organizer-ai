import { useState, useEffect, useCallback } from 'react';

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="upload"]',
    title: '📤 Upload de Fotos',
    description: 'Arraste ou selecione as fotos que deseja processar. Suporta JPG, PNG e HEIC.',
    position: 'right',
  },
  {
    target: '[data-tour="options"]',
    title: '⚙️ Opções de Processamento',
    description: 'Configure empresa, pórtico padrão e modo de processamento (IA ou econômico).',
    position: 'right',
  },
  {
    target: '[data-tour="process"]',
    title: '▶️ Processar',
    description: 'Clique para iniciar o processamento. A IA analisará cada foto automaticamente.',
    position: 'bottom',
  },
  {
    target: '[data-tour="results"]',
    title: '📊 Resultados',
    description: 'Veja os resultados do processamento, edite classificações e exporte para Excel.',
    position: 'right',
  },
  {
    target: '[data-tour="tree"]',
    title: '🌳 Árvore',
    description: 'Visualize as fotos organizadas por estrutura hierárquica e baixe o ZIP.',
    position: 'right',
  },
  {
    target: '[data-tour="download"]',
    title: '📥 Download',
    description: 'Baixe todas as fotos organizadas em pastas no formato ZIP.',
    position: 'bottom',
  },
];

export const useTour = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(() => {
    return localStorage.getItem('hasSeenTour') === 'true';
  });

  useEffect(() => {
    // Show tour on first visit
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    setHasSeenTour(true);
    localStorage.setItem('hasSeenTour', 'true');
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTour();
    }
  }, [currentStep, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    endTour();
  }, [endTour]);

  return {
    isActive,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    step: TOUR_STEPS[currentStep],
    steps: TOUR_STEPS,
    startTour,
    endTour,
    nextStep,
    prevStep,
    skipTour,
    hasSeenTour,
  };
};
