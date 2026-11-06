import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SplashPage() {
  const navigate = useNavigate();
  const { user, booting } = useAuth();

  useEffect(() => {
    if (booting) return;
    const t = setTimeout(() => {
      if (user) navigate('/app/home', { replace: true });
      else navigate('/onboarding', { replace: true });
    }, 1400);
    return () => clearTimeout(t);
  }, [booting, user, navigate]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-primary px-6 text-white">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-3xl font-bold">PF</div>
      <h1 className="text-2xl font-bold tracking-tight">PayFlow UPI</h1>
      <p className="mt-2 text-sm text-indigo-200">Simulated payments for learning & demos</p>
      <div className="mt-10 h-1 w-24 overflow-hidden rounded-full bg-white/20">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent-bright" />
      </div>
    </div>
  );
}
