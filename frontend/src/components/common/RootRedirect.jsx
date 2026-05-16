import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Home from '../pages/Home/Home';
import PublicShell from './PublicShell';

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  // Not logged in -> show public home (cùng Navbar/Footer như các trang công khai khác)
  if (!user) {
    return (
      <PublicShell>
        <Home />
      </PublicShell>
    );
  }

  // Logged in -> redirect based on role
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'showroom') return <Navigate to="/showroom/vehicles" replace />;

  // Default (renter or unknown) -> show public home
  return (
    <PublicShell>
      <Home />
    </PublicShell>
  );
};

export default RootRedirect;
