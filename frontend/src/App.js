import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import ChatWidget from './components/common/ChatWidget';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleRoute from './components/common/RoleRoute';
import Footer from './components/Footer/Footer';
import Navbar from './components/Navbar/Navbar';
import CarDetail from './components/pages/CarDetail/CarDetail';
import Home from './components/pages/Home/Home';
import Login from './components/pages/Login/Login';
import PartnerRegister from './components/pages/PartnerRegister/PartnerRegister';
import ShowroomPublic from './components/pages/ShowroomPublic/ShowroomPublic';
import { AuthProvider } from './contexts/AuthContext';
import { ChatWidgetProvider } from './contexts/ChatWidgetContext';
import DashboardLayout from './layouts/DashboardLayout';
import AdminDashboard from './pages/admin/AdminDashboard/AdminDashboard';
import AdminProfile from './pages/admin/AdminProfile/AdminProfile';
import ShowroomVerification from './pages/admin/ShowroomVerification/ShowroomVerification';
import TransactionMonitor from './pages/admin/TransactionMonitor/TransactionMonitor';
import UserManagement from './pages/admin/UserManagement/UserManagement';
import MyVehicles from './pages/owner/MyVehicles/MyVehicles';
import OwnerDashboard from './pages/owner/OwnerDashboard/OwnerDashboard';
import OwnerProfile from './pages/owner/OwnerProfile/OwnerProfile';
import Revenue from './pages/owner/Revenue/Revenue';
import VehicleTracking from './pages/owner/VehicleTracking/VehicleTracking';
import NotFound from './pages/NotFound';
import AIReports from './pages/renter/AIReports/AIReports';
import Checkout from './pages/renter/Checkout/Checkout';
import MapPage from './pages/renter/Map/MapPage';
import MyBookings from './pages/renter/MyBookings/MyBookings';
import PendingPayments from './pages/renter/PendingPayments/PendingPayments';
import PendingPickups from './pages/renter/PendingPickups/PendingPickups';
import PendingShowroomProcessing from './pages/renter/PendingShowroomProcessing/PendingShowroomProcessing';
import PaymentResult from './pages/renter/PaymentResult/PaymentResult';
import Profile from './pages/renter/Profile/Profile';
import RetryPayment from './pages/renter/RetryPayment/RetryPayment';
import RenterDashboard from './pages/renter/RenterDashboard/RenterDashboard';
import SOSReport from './pages/renter/SOSReport/SOSReport';
import Transactions from './pages/renter/Transactions/Transactions';
import AIInspection from './pages/showroom/AIInspection/AIInspection';
import BookingManagement from './pages/showroom/BookingManagement/BookingManagement';
import ContractManagement from './pages/showroom/ContractManagement/ContractManagement';
import CustomerManagement from './pages/showroom/CustomerManagement/CustomerManagement';
import RevenueReports from './pages/showroom/RevenueReports/RevenueReports';
import ShowroomDashboard from './pages/showroom/ShowroomDashboard/ShowroomDashboard';
import ShowroomProfile from './pages/showroom/ShowroomProfile/ShowroomProfile';
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

const PublicSite = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <div className="flex-1">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/xe/:id" element={<CarDetail />} />
        <Route path="/showrooms/:userId" element={<ShowroomPublic />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
    <Footer />
  </div>
);

const App = () => (
  <AuthProvider>
    <ChatWidgetProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/partner/register" element={<PartnerRegister />} />

          <Route path="/admin/dashboard" element={<DashboardPage roles={['admin']}><AdminDashboard /></DashboardPage>} />
          <Route path="/admin/users" element={<DashboardPage roles={['admin']}><UserManagement /></DashboardPage>} />
          <Route path="/admin/showrooms" element={<DashboardPage roles={['admin']}><ShowroomVerification /></DashboardPage>} />
          <Route path="/admin/transactions" element={<DashboardPage roles={['admin']}><TransactionMonitor /></DashboardPage>} />
          <Route path="/admin/profile" element={<DashboardPage roles={['admin']}><AdminProfile /></DashboardPage>} />
          <Route path="/admin/moderation" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/reports" element={<Navigate to="/admin/dashboard" replace />} />

          <Route path="/showroom/dashboard" element={<DashboardPage roles={['showroom']}><ShowroomDashboard /></DashboardPage>} />
          <Route path="/showroom/vehicles" element={<DashboardPage roles={['showroom']}><VehicleManagement /></DashboardPage>} />
          <Route path="/showroom/bookings" element={<DashboardPage roles={['showroom']}><BookingManagement /></DashboardPage>} />
          <Route path="/showroom/contracts" element={<DashboardPage roles={['showroom']}><ContractManagement /></DashboardPage>} />
          <Route path="/showroom/customers" element={<DashboardPage roles={['showroom']}><CustomerManagement /></DashboardPage>} />
          <Route path="/showroom/revenue" element={<DashboardPage roles={['showroom']}><RevenueReports /></DashboardPage>} />
          <Route path="/showroom/ai-inspection" element={<DashboardPage roles={['showroom']}><AIInspection /></DashboardPage>} />
          <Route path="/showroom/profile" element={<DashboardPage roles={['showroom']}><ShowroomProfile /></DashboardPage>} />

          <Route path="/owner/dashboard" element={<DashboardPage roles={['owner']}><OwnerDashboard /></DashboardPage>} />
          <Route path="/owner/vehicles" element={<DashboardPage roles={['owner']}><MyVehicles /></DashboardPage>} />
          <Route path="/owner/tracking" element={<DashboardPage roles={['owner']}><VehicleTracking /></DashboardPage>} />
          <Route path="/owner/revenue" element={<DashboardPage roles={['owner']}><Revenue /></DashboardPage>} />
          <Route path="/owner/profile" element={<DashboardPage roles={['owner']}><OwnerProfile /></DashboardPage>} />

          <Route path="/renter/dashboard" element={<RenterPage><RenterDashboard /></RenterPage>} />
          <Route path="/renter/profile" element={<RenterPage><Profile /></RenterPage>} />
          <Route path="/renter/pending-payments" element={<RenterPage><PendingPayments /></RenterPage>} />
          <Route path="/renter/pending-showroom-processing" element={<RenterPage><PendingShowroomProcessing /></RenterPage>} />
          <Route path="/renter/pending-pickups" element={<RenterPage><PendingPickups /></RenterPage>} />
          <Route path="/renter/bookings" element={<RenterPage><MyBookings /></RenterPage>} />
          <Route path="/renter/ai-reports" element={<RenterPage><AIReports /></RenterPage>} />
          <Route path="/renter/transactions" element={<RenterPage><Transactions /></RenterPage>} />
          <Route path="/renter/checkout/:carId" element={<RenterPage><Checkout /></RenterPage>} />
          <Route path="/renter/checkout" element={<RenterPage><Checkout /></RenterPage>} />
          <Route path="/renter/retry-payment/:bookingId" element={<RenterOnlyPage><RetryPayment /></RenterOnlyPage>} />
          <Route path="/renter/payment-result" element={<RenterOnlyPage><PaymentResult /></RenterOnlyPage>} />
          <Route path="/renter/sos" element={<RenterPage><SOSReport /></RenterPage>} />

          <Route path="/*" element={<PublicSite />} />
        </Routes>
        <ChatWidget />
      </Router>
    </ChatWidgetProvider>
  </AuthProvider>
);

export default App;
