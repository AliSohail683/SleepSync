/**
 * Onboarding Flow Container
 * Manages the multi-step onboarding process
 */

import React, { useMemo, useState } from 'react';
import { Welcome } from './Welcome';
import { BasicInfo } from './BasicInfo';
import { SleepGoals } from './SleepGoals';
import { Preferences } from './Preferences';
import { Permissions } from './Permissions';
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

  const sleepSummary = useMemo(() => {
    const sleepGoalHours = formData.sleepGoalHours ?? 8;
    const averageBedtime = formData.averageBedtime ?? null;
    const averageWakeTime = formData.averageWakeTime ?? null;
    const weekdayBedtime = (formData as any).weekdayBedtime ?? null;
    const weekdayWakeTime = (formData as any).weekdayWakeTime ?? null;
    const weekendBedtime = (formData as any).weekendBedtime ?? null;
    const weekendWakeTime = (formData as any).weekendWakeTime ?? null;
    const recentSleepHours: number[] | undefined = (formData as any).recentSleepHours;
    const fatigueLevel: number | undefined = (formData as any).fatigueLevel;
    const performanceGoals: string[] | undefined = (formData as any).performanceGoals;

    let estimatedCurrentHours: number | null = null;
    let estimatedWeeklyDebt: number | null = null;

    if (recentSleepHours && recentSleepHours.length > 0) {
      const avgRecent =
        recentSleepHours.reduce((sum, h) => sum + h, 0) / recentSleepHours.length;
      estimatedCurrentHours = +avgRecent.toFixed(1);
      const nightlyDebt = Math.max(0, sleepGoalHours - estimatedCurrentHours);
      estimatedWeeklyDebt = +(nightlyDebt * 7).toFixed(1);
    } else if (averageBedtime && averageWakeTime) {
      const [bedH, bedM] = averageBedtime.split(':').map(Number);
      const [wakeH, wakeM] = averageWakeTime.split(':').map(Number);
      let diffMinutes =
        (wakeH * 60 + wakeM) -
        (bedH * 60 + bedM);
      if (diffMinutes <= 0) {
        diffMinutes += 24 * 60;
      }
      estimatedCurrentHours = +(diffMinutes / 60).toFixed(1);

      const nightlyDebt = Math.max(0, sleepGoalHours - estimatedCurrentHours);
      estimatedWeeklyDebt = +(nightlyDebt * 7).toFixed(1);
    }

    return {
      sleepGoalHours,
      averageBedtime,
      averageWakeTime,
      estimatedCurrentHours,
      estimatedWeeklyDebt,
      weekdayBedtime,
      weekdayWakeTime,
      weekendBedtime,
      weekendWakeTime,
      fatigueLevel,
      performanceGoals,
    };
  }, [formData]);

  // Render current step
  const steps = [
    <Welcome key="welcome" onNext={() => setCurrentStep(1)} />,
    <BasicInfo key="basic" onNext={handleNext} onBack={handleBack} />,
    <SleepGoals key="goals" onNext={handleNext} onBack={handleBack} />,
    <Preferences key="preferences" onNext={handleNext} onBack={handleBack} />,
    <Permissions key="permissions" onNext={handleNext} onBack={handleBack} />,
    <Complete key="complete" onComplete={handleComplete} summary={sleepSummary} />,
  ];

  return steps[currentStep] || null;
};

