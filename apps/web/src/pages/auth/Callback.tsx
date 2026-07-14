import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import AuthLayout from './AuthLayout';

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate('/auth/signin', { replace: true });
        return;
      }

      try {
        await api.post('/api/auth/oauth-callback');
      } catch {
        // User may already exist in local DB — that's fine
      }

      navigate('/', { replace: true });
    };

    handleCallback();
  }, [navigate]);

  return (
    <AuthLayout title="Completing sign in...">
      <div className="flex justify-center py-4">
        <div className="w-6 h-6 border-2 border-accent-start border-t-transparent rounded-full animate-spin" />
      </div>
    </AuthLayout>
  );
}
