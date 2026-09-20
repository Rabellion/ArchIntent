import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import HomePage from '../pages/HomePage';
import PendingVerificationPage from '../pages/PendingVerificationPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';
import PublicLayout from '../layouts/PublicLayout';
import ArchitectDashboard from '../pages/ArchitectDashboard';
import ArchitectProfile from '../pages/ArchitectProfile';
import ArchitectPortfolio from '../pages/ArchitectPortfolio';
import ArchitectsBrowse from '../pages/ArchitectsBrowse';
import ArchitectDetail from '../pages/ArchitectDetail';
import ArchitectProjectDetail from '../pages/ArchitectProjectDetail';
import ContractorDashboard from '../pages/ContractorDashboard';
import ContractorProfile from '../pages/ContractorProfile';
import ContractorPortfolio from '../pages/ContractorPortfolio';
import ContractorBids from '../pages/ContractorBids';
import ContractorDetail from '../pages/ContractorDetail';
import ContractorProjectDetail from '../pages/ContractorProjectDetail';
import ClientDashboard from '../pages/ClientDashboard';
import MyProjects from '../pages/MyProjects';
import CreateProject from '../pages/CreateProject';
import ProjectDetail from '../pages/ProjectDetail';
import Payment from '../pages/Payment';
import PaymentHistory from '../pages/PaymentHistory';
import MatchedArchitects from '../pages/MatchedArchitects';
import ConstructionJobs from '../pages/ConstructionJobs';
import ConstructionJobDetail from '../pages/ConstructionJobDetail';
import BuyBudz from '../pages/BuyBudz';
import ProjectAgreement from '../pages/ProjectAgreement';
import AdminDashboard from '../pages/AdminDashboard';
import AdminUsers from '../pages/AdminUsers';
import AdminVerifyArchitects from '../pages/AdminVerifyArchitects';
import AdminVerifyArchitectDetail from '../pages/AdminVerifyArchitectDetail';
import AdminVerifyContractors from '../pages/AdminVerifyContractors';
import AdminVerifyContractorDetail from '../pages/AdminVerifyContractorDetail';
import AdminVerificationDocuments from '../pages/AdminVerificationDocuments';
import AdminAnalytics from '../pages/AdminAnalytics';
import AdminLogs from '../pages/AdminLogs';
import MessagesPage from '../pages/chat/MessagesPage';
import ProfilePage from '../pages/ProfilePage';
import VerifyOtpPage from '../pages/VerifyOtpPage';

const getDashboardPath = (role?: string) => {
  if (role === 'client') return '/dashboard/client';
  if (role === 'architect') return '/dashboard/architect';
  if (role === 'contractor') return '/dashboard/contractor';
  if (role === 'admin') return '/dashboard/admin';
  return '/login';
};

const HomeRoute = () => {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (token && user) {
    // Architect/Contractor need to complete profile first (onboarding gate only)
    if ((user.role === 'architect' || user.role === 'contractor') && !user.profile_completed) {
      const profilePath = user.role === 'architect' ? '/dashboard/architect/profile' : '/dashboard/contractor/profile';
      return <Navigate to={profilePath} replace />;
    }
  }

  return <HomePage />;
};

const LoginRoute = () => {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  if (token && user) {
    // Architect/Contractor need to complete profile first
    if ((user.role === 'architect' || user.role === 'contractor') && !user.profile_completed) {
      const profilePath = user.role === 'architect' ? '/dashboard/architect/profile' : '/dashboard/contractor/profile';
      return <Navigate to={profilePath} replace />;
    }
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <PublicLayout><LoginPage /></PublicLayout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
      <Route path="/verify-otp" element={<PublicLayout><VerifyOtpPage /></PublicLayout>} />
      <Route path="/pending-verification" element={<PublicLayout><PendingVerificationPage /></PublicLayout>} />
      <Route path="/architects" element={<PublicLayout><ArchitectsBrowse /></PublicLayout>} />
      <Route path="/architect/:id" element={<PublicLayout><ArchitectDetail /></PublicLayout>} />
      <Route path="/architect/projects/:projectRef" element={<PublicLayout><ArchitectProjectDetail /></PublicLayout>} />
      <Route path="/contractor/projects/:projectRef" element={<PublicLayout><ContractorProjectDetail /></PublicLayout>} />
      <Route path="/contractor/:id" element={<PublicLayout><ContractorDetail /></PublicLayout>} />

      {/* Architect Routes (Protected with MainLayout) */}
      <Route
        path="/dashboard/architect"
        element={
          <ProtectedRoute allowedRole="architect">
            <MainLayout>
              <ArchitectDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/architect/profile"
        element={
          <ProtectedRoute allowedRole="architect">
            <MainLayout>
              <ArchitectProfile />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/architect/portfolio"
        element={
          <ProtectedRoute allowedRole="architect">
            <MainLayout>
              <ArchitectPortfolio />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/architect/projects"
        element={
          <ProtectedRoute allowedRole="architect">
            <MainLayout>
              <ArchitectDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Contractor Routes (Protected with MainLayout) */}
      <Route
        path="/dashboard/contractor"
        element={
          <ProtectedRoute allowedRole="contractor">
            <MainLayout>
              <ContractorDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/contractor/profile"
        element={
          <ProtectedRoute allowedRole="contractor">
            <MainLayout>
              <ContractorProfile />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/contractor/portfolio"
        element={
          <ProtectedRoute allowedRole="contractor">
            <MainLayout>
              <ContractorPortfolio />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/contractor/bids"
        element={
          <ProtectedRoute allowedRole="contractor">
            <MainLayout>
              <ContractorBids />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/contractor/buy-budz"
        element={
          <ProtectedRoute allowedRole="contractor">
            <MainLayout>
              <BuyBudz />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/construction-jobs"
        element={
          <ProtectedRoute allowedRole="contractor">
            <MainLayout>
              <ConstructionJobs />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/construction-jobs/:id"
        element={
          <ProtectedRoute allowedRole="contractor">
            <MainLayout>
              <ConstructionJobDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Client Routes (Protected with MainLayout) */}
      <Route
        path="/dashboard/client"
        element={
          <ProtectedRoute allowedRole="client">
            <MainLayout>
              <ClientDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/client/projects"
        element={
          <ProtectedRoute allowedRole="client">
            <MainLayout>
              <MyProjects />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/client/create-project"
        element={
          <ProtectedRoute allowedRole="client">
            <MainLayout>
              <CreateProject />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id"
        element={
          <ProtectedRoute allowedRoles={['client', 'architect', 'contractor']}>
            <MainLayout>
              <ProjectDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/matches"
        element={
          <ProtectedRoute allowedRole="client">
            <MainLayout>
              <MatchedArchitects />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/agreement"
        element={
          <ProtectedRoute allowedRoles={['client', 'architect']}>
            <MainLayout>
              <ProjectAgreement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id/payment"
        element={
          <ProtectedRoute allowedRole="client">
            <MainLayout>
              <Payment />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/client/payments"
        element={
          <ProtectedRoute allowedRole="client">
            <MainLayout>
              <PaymentHistory />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['client', 'architect', 'contractor', 'admin']}>
            <MainLayout>
              <ProfilePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/messages"
        element={
          <ProtectedRoute allowedRoles={['client', 'architect', 'contractor', 'admin']}>
            <MainLayout>
              <MessagesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes (Protected with MainLayout) */}
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout>
              <AdminUsers />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verify-architects"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout>
              <AdminVerifyArchitects />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verify-architects/:id/documents"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout>
              <AdminVerificationDocuments />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verify-architects/:id"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout>
              <AdminVerifyArchitectDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verify-contractors"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout>
              <AdminVerifyContractors />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verify-contractors/:id/documents"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout>
              <AdminVerificationDocuments />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verify-contractors/:id"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout>
              <AdminVerifyContractorDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout>
              <AdminAnalytics />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout>
              <AdminLogs />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch all unknown routes */}
      <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
    </Routes>
  );
};

export default AppRoutes;