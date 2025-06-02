import {
  BrowserRouter as Router,
  Routes,
  Route,
  // Navigate,
} from "react-router-dom";
import { UserProvider } from "./contexts/UserContext";
import { DocumentProvider } from "./contexts/DocumentContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import DocumentView from "./pages/Document/DocumentView";
import Login from "./pages/Login";
import MyDocuments from "./pages/Document/MyDocuments";
import PendingApprovals from "./pages/PendingApprovals";
import RecentActivity from "./pages/RecentActivity";
import DepartmentFiles from "./pages/DepartmentFiles";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import { HomePage } from "./pages/HomePage";
import { DocumentTypesPage } from "./pages/Document/DocumentTypesPage";
import { RegionsPage } from "./pages/LocationPages/RegionsPage";
import { MunicipalitiesPage } from "./pages/LocationPages/MunicipalitiesPage";
import { BarangaysPage } from "./pages/LocationPages/BarangaysPage";
import { LGUMaintenancePage } from "./pages/LGUMaintenancePage";
import { AccountingPage } from "./pages/AccountingPage";
import { RPTPage } from "./pages/RPTPage";
import { UsersPage } from "./pages/Users/UsersPage";
import UserAccessPage from "./pages/Users/UsersAccessPage";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
// import RedirectHandler from "./components/layout/RedirectHandler";
import { AllocationPanel } from "./pages/Digitalization/Allocation";
import { BatchUploadPanel } from "./pages/Digitalization/BatchUpload";
import { DepartmentsMain } from "./pages/Departments/DepartmentsMain";
import { DepartmentsSub } from "./pages/Departments/DepartmentsSub";
import { HandWrittenOCRUploader } from "./pages/OCR/HandWrittenDocs";
import { TemplateOCR } from "./pages/OCR/Template";
import UnrecordedOCR from "./pages/OCR/Unrecorded";
import ChangePassword from "./pages/Settings/ChangePassword";
import DocumentUpload from "./pages/Document/Upload";

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
                      path="/documents/document-types"
                      element={<DocumentTypesPage />}
                    />
                    <Route
                      path="/documents/upload"
                      element={<DocumentUpload />}
                    />
                    {/* ----------------------OCR check-------------------- */}
                    <Route path="/ocr/unrecorded" element={<UnrecordedOCR />} />
                    <Route
                      path="/ocr/handwritten"
                      element={<HandWrittenOCRUploader />}
                    />
                    <Route path="/ocr/template" element={<TemplateOCR />} />
                    {/* //------------------ departments------------------ */}
                    <Route
                      path="/departments/main"
                      element={<DepartmentsMain />}
                    />
                    <Route
                      path="/departments/sub"
                      element={<DepartmentsSub />}
                    />
                    {/* -----------USERS------------- */}
                    <Route path="/users/members" element={<UsersPage />} />
                    <Route path="/users/access" element={<UserAccessPage />} />
                    {/* ---------------LOCATIONS--------------- */}
                    <Route
                      path="/locations/regions"
                      element={<RegionsPage />}
                    />
                    <Route
                      path="/locations/municipalities"
                      element={<MunicipalitiesPage />}
                    />
                    <Route
                      path="/locations/barangays"
                      element={<BarangaysPage />}
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
                    {/* ------------------LGU MAINTENANCE----------------- */}
                    <Route path="/lgu" element={<LGUMaintenancePage />} />
                    {/* ---------------ACCOUNTING && RPT--------------- */}
                    <Route path="/accounting" element={<AccountingPage />} />
                    <Route path="/rpt" element={<RPTPage />} />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Login />} />
              </Routes>
            </NotificationProvider>
          </DocumentProvider>
        </UserProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
