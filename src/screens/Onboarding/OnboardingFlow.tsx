/**
 * Onboarding Flow Container
 * Manages the multi-step onboarding process
 */

import React, { useState } from 'react';
import { Welcome } from './Welcome';
import { BasicInfo } from './BasicInfo';
import { SleepGoals } from './SleepGoals';
import { Preferences } from './Preferences';
import { Complete } from './Complete';
import { useUserStore } from '../../store/userStore';
import { UserProfile } from '../../models';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  
  const { createProfile, setOnboardingComplete } = useUserStore();

  const handleNext = (data: any) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = async () => {
    try {
      // Create user profile with collected data
      await createProfile(formData);
      await setOnboardingComplete(true);
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  // Render current step
  const steps = [
    <Welcome key="welcome" onNext={() => setCurrentStep(1)} />,
    <BasicInfo key="basic" onNext={handleNext} onBack={handleBack} />,
    <SleepGoals key="goals" onNext={handleNext} onBack={handleBack} />,
    <Preferences key="preferences" onNext={handleNext} onBack={handleBack} />,
    <Complete key="complete" onComplete={handleComplete} />,
  ];

  return steps[currentStep] || null;
};

