import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  // Navigate,
} from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { DocumentProvider } from './contexts/DocumentContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import DocumentView from './pages/Document/DocumentView';
import Login from './pages/Login';
import MyDocuments from './pages/Document/MyDocuments';
import PendingApprovals from './pages/PendingApprovals';
import RecentActivity from './pages/RecentActivity';
import DepartmentFiles from './pages/DepartmentFiles';
import Team from './pages/Team';
import Settings from './pages/Settings';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/Users/UsersPage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AllocationPanel } from './pages/Digitalization/Allocation';
import { BatchUploadPanel } from './pages/Digitalization/BatchUpload';
import { DepartmentsMain } from './pages/Departments/DepartmentsMain';
import { SubDepartments } from './pages/Departments/SubDepartments';
import { TemplateOCR } from './pages/OCR/Template';
import UnrecordedOCR from './pages/OCR/Unrecorded';
import ChangePassword from './pages/Settings/ChangePassword';
import DocumentUpload from './pages/Document/Upload';
import ModulesManagement from './pages/Users/ModulesManagement';
import UserAccessPage from './pages/Users/Users Access/UsersAccessPage';
import OCRFieldsManagement from './pages/OCR/Fields/OCRFieldsManagement';
import ApprovalMatrix from './components/ApprovalMatrix';

function App() {
  return (
    <Router>
      <AuthProvider>
        <UserProvider>
          <DocumentProvider>
            <NotificationProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                {/* Root path handling */}
                <Route path="/" element={<RootRedirect />} />
                {/* Protected routes start here */}
                <Route element={<ProtectedRoute />}>
                  {/* Home Page should not use layout */}
                  <Route path="/home" element={<HomePage />} />

                  {/* All other routes wrapped in layout */}
                  <Route element={<Layout />}>
                    {/* // in testing phase ------->>> ocr  */}
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/my-documents" element={<MyDocuments />} />
                    <Route
                      path="/pending-approvals"
                      element={<PendingApprovals />}
                    />
                    <Route path="/activity" element={<RecentActivity />} />
                    <Route path="/department" element={<DepartmentFiles />} />
                    <Route path="/team" element={<Team />} />
                    <Route
                      path="/documents/:documentId"
                      element={<DocumentView />}
                    />
                    {/* -------------------Settings---------------------- */}
                    <Route path="/settings" element={<Settings />} />
                    <Route
                      path="/settings/change-password"
                      element={<ChangePassword />}
                    />
                    {/* ----------------------Document && Document Types-------------------- */}

                    <Route
                      path="/documents/upload"
                      element={<DocumentUpload />}
                    />
                    <Route
                      path="/documents/library"
                      element={<MyDocuments />}
                    />

                    {/* ----------------------OCR check-------------------- */}
                    <Route path="/ocr/unrecorded" element={<UnrecordedOCR />} />
                    <Route
                      path="/ocr/fields"
                      element={<OCRFieldsManagement />}
                    />
                    <Route path="/ocr/template" element={<TemplateOCR />} />
                    {/* //------------------ departments------------------ */}
                    <Route
                      path="/departments/main"
                      element={<DepartmentsMain />}
                    />
                    <Route
                      path="/departments/sub"
                      element={<SubDepartments />}
                    />
                    {/* -----------USERS------------- */}
                    <Route path="/users/members" element={<UsersPage />} />
                    <Route path="/users/access" element={<UserAccessPage />} />
                    <Route
                      path="/users/modules"
                      element={<ModulesManagement />}
                    />
                    {/* ------------------DIGITALIZATION----------------- */}
                    <Route
                      path="/digitalization/allocation"
                      element={<AllocationPanel />}
                    />
                    <Route
                      path="/digitalization/batch-upload"
                      element={<BatchUploadPanel />}
                    />
                    {/* ------------------Matrix----------------- */}
                    <Route
                      path="/approval-matrix"
                      element={<ApprovalMatrix />}
                    />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<RootRedirect />} />
              </Routes>
            </NotificationProvider>
          </DocumentProvider>
        </UserProvider>
      </AuthProvider>
    </Router>
  );
}
// Add this new component
function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null; // or <LoadingSpinner />

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  } else {
    return <Navigate to="/login" replace />;
  }
}

// export default App;
export default App;
