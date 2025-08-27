'use client';

import { Card, CardHeader } from '@/components/ui/card';
import AuthForm from '@/components/AuthForm';
import DevicePairing from '@/components/DevicePairing';

type SearchParams = {
  source?: string;
  code?: string;
}

interface ClientHomepageProps {
  searchParams?: SearchParams;
}

export default function ClientHomepage({ searchParams }: ClientHomepageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Productory Powerups for Gamma</h1>
          <p className="text-muted-foreground mt-2">Supercharge your Gamma presentations with timetable creation and more</p>
        </div>

        <DevicePairing searchParams={searchParams} />

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <AuthForm />
          </CardHeader>
        </Card>
        
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Transform your Gamma presentations with productivity enhancements. Part of the growing Productory Powerups suite built by educators, for educators.</p>
        </div>
      </div>
    </div>
  );
}