import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Home from '../pages/Home/Home';

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  // Not logged in -> show public home
  if (!user) return <Home />;

  // Logged in -> redirect based on role
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'showroom') return <Navigate to="/showroom/dashboard" replace />;

  // Default (renter or unknown) -> show public home
  return <Home />;
};

export default RootRedirect;
