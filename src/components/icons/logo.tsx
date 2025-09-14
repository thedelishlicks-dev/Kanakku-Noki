import { ShieldCheck } from 'lucide-react';

export function AuthFlowLogo() {
  return (
    <div className="flex items-center justify-center gap-2 text-primary">
      <ShieldCheck className="h-8 w-8" />
      <h1 className="text-2xl font-bold font-headline">AuthFlow</h1>
    </div>
  );
}
