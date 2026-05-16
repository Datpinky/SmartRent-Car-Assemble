import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleRoute from './components/common/RoleRoute';
import RootRedirect from './components/common/RootRedirect';
import PublicShell from './components/common/PublicShell';
import CarDetail from './components/pages/CarDetail/CarDetail';
import Home from './components/pages/Home/Home';
import Login from './components/pages/Login/Login';
import PartnerRegister from './components/pages/PartnerRegister/PartnerRegister';
import ShowroomPublic from './components/pages/ShowroomPublic/ShowroomPublic';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import AdminDashboard from './pages/admin/AdminDashboard/AdminDashboard';
import AdminProfile from './pages/admin/AdminProfile/AdminProfile';
import AdminWithdrawals from './pages/admin/AdminWithdrawals/AdminWithdrawals';
import DriverLicenseVerification from './pages/admin/DriverLicenseVerification/DriverLicenseVerification';
import ShowroomVerification from './pages/admin/ShowroomVerification/ShowroomVerification';
import TransactionMonitor from './pages/admin/TransactionMonitor/TransactionMonitor';
import UserManagement from './pages/admin/UserManagement/UserManagement';
import NotFound from './pages/NotFound';
import AIReports from './pages/renter/AIReports/AIReports';
import Checkout from './pages/renter/Checkout/Checkout';
import MapPage from './pages/renter/Map/MapPage';
import MyBookings from './pages/renter/MyBookings/MyBookings';
import MyContracts from './pages/renter/MyContracts/MyContracts';
import PaymentResult from './pages/renter/PaymentResult/PaymentResult';
import PendingPayments from './pages/renter/PendingPayments/PendingPayments';
import PendingPickups from './pages/renter/PendingPickups/PendingPickups';
import PendingShowroomProcessing from './pages/renter/PendingShowroomProcessing/PendingShowroomProcessing';
import Profile from './pages/renter/Profile/Profile';
import RenterDashboard from './pages/renter/RenterDashboard/RenterDashboard';
import RetryPayment from './pages/renter/RetryPayment/RetryPayment';
import ReturnInspectionHistory from './pages/renter/ReturnInspectionHistory/ReturnInspectionHistory';
import Transactions from './pages/renter/Transactions/Transactions';
import AIInspection from './pages/showroom/AIInspection/AIInspection';
import BookingManagement from './pages/showroom/BookingManagement/BookingManagement';
import ContractManagement from './pages/showroom/ContractManagement/ContractManagement';
import CustomerManagement from './pages/showroom/CustomerManagement/CustomerManagement';
import RevenueReports from './pages/showroom/RevenueReports/RevenueReports';
import ShowroomProfile from './pages/showroom/ShowroomProfile/ShowroomProfile';
import ShowroomWithdrawals from './pages/showroom/ShowroomWithdrawals/ShowroomWithdrawals';
import VehicleManagement from './pages/showroom/VehicleManagement/VehicleManagement';

const DashboardPage = ({ children, roles }) => (
  <ProtectedRoute>
    <RoleRoute roles={roles}>
      <DashboardLayout>{children}</DashboardLayout>
    </RoleRoute>
  </ProtectedRoute>
);

const RenterPage = ({ children }) => (
  <ProtectedRoute>
    <RoleRoute roles={['renter']}>
      <DashboardLayout>{children}</DashboardLayout>
    </RoleRoute>
  </ProtectedRoute>
);

const RenterOnlyPage = ({ children }) => (
  <ProtectedRoute>
    <RoleRoute roles={['renter']}>{children}</RoleRoute>
  </ProtectedRoute>
);

const ADMIN_DASHBOARD_ROUTES = [
  { path: '/admin/dashboard', component: <AdminDashboard /> },
  { path: '/admin/users', component: <UserManagement /> },
  { path: '/admin/showrooms', component: <ShowroomVerification /> },
  { path: '/admin/driver-licenses', component: <DriverLicenseVerification /> },
  { path: '/admin/transactions', component: <TransactionMonitor /> },
  { path: '/admin/withdrawals', component: <AdminWithdrawals /> },
  { path: '/admin/profile', component: <AdminProfile /> },
];

const ADMIN_REDIRECT_ROUTES = [
  { path: '/admin/moderation', to: '/admin/dashboard' },
  { path: '/admin/reports', to: '/admin/dashboard' },
];

const SHOWROOM_DASHBOARD_ROUTES = [
  { path: '/showroom/vehicles', component: <VehicleManagement /> },
  { path: '/showroom/bookings', component: <BookingManagement /> },
  { path: '/showroom/contracts', component: <ContractManagement /> },
  { path: '/showroom/customers', component: <CustomerManagement /> },
  { path: '/showroom/revenue', component: <RevenueReports /> },
  { path: '/showroom/ai-inspection', component: <AIInspection /> },
  { path: '/showroom/withdrawals', component: <ShowroomWithdrawals /> },
  { path: '/showroom/profile', component: <ShowroomProfile /> },
];

const RENTER_DASHBOARD_ROUTES = [
  { path: '/renter/dashboard', component: <RenterDashboard /> },
  { path: '/renter/profile', component: <Profile /> },
  { path: '/renter/pending-payments', component: <PendingPayments /> },
  { path: '/renter/pending-showroom-processing', component: <PendingShowroomProcessing /> },
  { path: '/renter/pending-pickups', component: <PendingPickups /> },
  { path: '/renter/bookings', component: <MyBookings /> },
  { path: '/renter/return-inspections', component: <ReturnInspectionHistory /> },
  { path: '/renter/ai-reports', component: <AIReports /> },
  { path: '/renter/transactions', component: <Transactions /> },
  { path: '/renter/contracts', component: <MyContracts /> },
  { path: '/renter/checkout/:carId', component: <Checkout /> },
  { path: '/renter/checkout', component: <Checkout /> },
];

const RENTER_ONLY_ROUTES = [
  { path: '/renter/retry-payment/:bookingId', component: <RetryPayment /> },
  { path: '/renter/payment-result', component: <PaymentResult /> },
];

const PublicSite = () => (
  <PublicShell>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/xe/:id" element={<CarDetail />} />
      <Route path="/showrooms/:userId" element={<ShowroomPublic />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </PublicShell>
);

const App = () => (
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/partner/register" element={<PartnerRegister />} />

        <Route path="/" element={<RootRedirect />} />

        {ADMIN_DASHBOARD_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<DashboardPage roles={['admin']}>{route.component}</DashboardPage>}
          />
        ))}
        {ADMIN_REDIRECT_ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={<Navigate to={route.to} replace />} />
        ))}

        {SHOWROOM_DASHBOARD_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<DashboardPage roles={['showroom']}>{route.component}</DashboardPage>}
          />
        ))}

        {RENTER_DASHBOARD_ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={<RenterPage>{route.component}</RenterPage>} />
        ))}
        {RENTER_ONLY_ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={<RenterOnlyPage>{route.component}</RenterOnlyPage>} />
        ))}

        <Route path="/*" element={<PublicSite />} />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
      />
    </Router>
  </AuthProvider>
);

export default App;
