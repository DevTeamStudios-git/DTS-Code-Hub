import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { session, loading, requires2FA, twoFactorVerified } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-start border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  if (requires2FA && !twoFactorVerified) {
    return <Navigate to="/auth/2fa" replace />;
  }

  return <>{children}</>;
}
