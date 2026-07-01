import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { ClaimantRegistrationPage } from "./pages/ClaimantRegistrationPage";
import { DefendantRegistrationPage } from "./pages/DefendantRegistrationPage";
import { LoginPage } from "./pages/LoginPage";
import { PartiesPage } from "./pages/PartiesPage";
import { PreviewPage } from "./pages/PreviewPage";
import { RTComposerPage } from "./pages/RTComposerPage";
import { RtListPage } from "./pages/RtListPage";
import { UserRegistrationPage } from "./pages/UserRegistrationPage";
import { UserDashboardPage } from "./pages/UserDashboardPage";

function HomeRedirect() {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADVOGADO", "ASSISTENTE"]}>
            <UserDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rt"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADVOGADO", "ASSISTENTE"]}>
            <RtListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rt/montar"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADVOGADO", "ASSISTENTE"]}>
            <RTComposerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios/cadastrar"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <UserRegistrationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cadastros-partes"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADVOGADO", "ASSISTENTE"]}>
            <Navigate to="/cadastros-partes/reclamante" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cadastros-partes/reclamante"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADVOGADO", "ASSISTENTE"]}>
            <ClaimantRegistrationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cadastros-partes/reclamada"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADVOGADO", "ASSISTENTE"]}>
            <DefendantRegistrationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partes"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADVOGADO", "ASSISTENTE"]}>
            <PartiesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preview/:processoId"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "ADVOGADO", "ASSISTENTE"]}>
            <PreviewPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
