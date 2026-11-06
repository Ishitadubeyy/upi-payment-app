import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button, DemoBanner, Input } from '../components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await login(values.identifier.trim(), values.password);
      toast.success('Welcome back!');
      navigate('/app/home');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-8">
      <h1 className="text-2xl font-bold text-primary">Log in</h1>
      <p className="mt-1 text-sm text-slate-600">Email, mobile, or demo UPI ID</p>
      <div className="my-4">
        <DemoBanner compact />
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Email / mobile / UPI ID"
          autoComplete="username"
          error={errors.identifier?.message}
          {...register('identifier', { required: 'Required' })}
        />
        <div>
          <Input
            label="Password"
            type={showPass ? 'text' : 'password'}
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', { required: 'Required' })}
          />
          <button
            type="button"
            className="mt-2 flex items-center gap-1 text-xs text-slate-500"
            onClick={() => setShowPass((s) => !s)}
          >
            {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPass ? 'Hide' : 'Show'} password
          </button>
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{' '}
        <Link to="/register" className="font-semibold text-accent">
          Register
        </Link>
      </p>
    </div>
  );
}
