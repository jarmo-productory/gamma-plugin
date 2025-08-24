'use client';

import { Button } from './Button';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="text-center max-w-[600px] mx-auto">
      <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
        Transform Presentations into Timetables
      </h1>
      
      <p className="text-xl text-gray-600 mb-8 leading-relaxed">
        Automatically extract and organize your Gamma presentation content
      </p>
      
      <Button 
        variant="primary" 
        size="lg"
        onClick={onGetStarted}
      >
        Get Started
      </Button>
    </div>
  );
}