import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "./Spinner.jsx";

/**
 * Gate for protected pages.
 * - waits while the stored token is being validated
 * - redirects to /login when nobody is signed in
 * - redirects away when an admin-only page is opened by a member
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return children;
}
