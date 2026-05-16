import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_DEFAULT_PATHS = {
  admin: '/admin/dashboard',
  showroom: '/showroom/vehicles',
  renter: '/renter/dashboard',
};

const RoleRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    const fallback = ROLE_DEFAULT_PATHS[user.role] || '/';
    return <Navigate to={fallback} replace />;
  }
  return children;
};

export default RoleRoute;
