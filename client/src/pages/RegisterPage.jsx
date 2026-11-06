import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button, DemoBanner, Input } from '../components/ui';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await registerUser(values);
      toast.success('Demo account created (phone verification simulated)');
      navigate('/app/home');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-8">
      <h1 className="text-2xl font-bold text-primary">Create account</h1>
      <p className="mt-1 text-sm text-slate-600">Start with a demo wallet balance</p>
      <div className="my-4">
        <DemoBanner compact />
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Full name" error={errors.name?.message} {...register('name', { required: 'Required', minLength: 2 })} />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email', { required: 'Required' })}
        />
        <Input
          label="Mobile number"
          inputMode="numeric"
          placeholder="10-digit Indian mobile"
          error={errors.phone?.message}
          {...register('phone', {
            required: 'Required',
            pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit mobile' },
          })}
        />
        <p className="-mt-2 text-xs text-slate-500">OTP verification is simulated in this college demo.</p>
        <Input
          label="Password"
          type="password"
          error={errors.password?.message}
          {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
        />
        <Input
          label="Confirm password"
          type="password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Required',
            validate: (v) => v === watch('password') || 'Passwords do not match',
          })}
        />
        <Button type="submit" className="w-full" loading={loading}>
          Register
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent">
          Log in
        </Link>
      </p>
    </div>
  );
}
