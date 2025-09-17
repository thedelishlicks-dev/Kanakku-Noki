import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { KanakkuLogo } from '../icons/logo';

export default function WelcomeScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center justify-center gap-6 text-center">
        <KanakkuLogo />
        <p className="max-w-md text-muted-foreground">
          Your personal finance companion. Track expenses, manage budgets, and achieve your financial goals with ease.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/dashboard">Login</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/dashboard">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
