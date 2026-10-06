import { Navigate } from "react-router-dom";

/** Legacy unified staff login — organizers enter via /organizers/login. */
export default function StaffLogin() {
  return <Navigate to="/organizers/login" replace />;
}
