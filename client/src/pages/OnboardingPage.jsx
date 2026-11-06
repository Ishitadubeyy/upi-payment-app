import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, QrCode } from 'lucide-react';
import { Button, DemoBanner } from '../components/ui';

const slides = [
  {
    icon: Zap,
    title: 'Send instantly (demo)',
    text: 'Practice UPI-style transfers between demo accounts with a real ledger backend.',
  },
  {
    icon: QrCode,
    title: 'Scan & receive',
    text: 'Use demo QR codes to identify recipients — never real NPCI rails.',
  },
  {
    icon: Shield,
    title: 'Safe for college demos',
    text: 'All balances and receipts are simulated. No bank accounts required.',
  },
];

export default function OnboardingPage() {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const Icon = slide.icon;

  return (
    <div className="flex min-h-full flex-col px-6 py-8">
      <div className="mb-6">
        <DemoBanner />
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-accent">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-primary">{slide.title}</h2>
        <p className="mt-3 text-slate-600">{slide.text}</p>
        <div className="mt-8 flex gap-2">
          {slides.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i === index ? 'bg-accent' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>
      <div className="mt-8 space-y-3">
        {index < slides.length - 1 ? (
          <Button className="w-full" onClick={() => setIndex((i) => i + 1)}>
            Continue
          </Button>
        ) : (
          <>
            <Link to="/login">
              <Button className="w-full">Log in</Button>
            </Link>
            <Link to="/register">
              <Button variant="secondary" className="w-full">
                Create demo account
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
