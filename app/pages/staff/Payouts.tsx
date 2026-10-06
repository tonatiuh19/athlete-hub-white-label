import { Navigate, useSearchParams } from "react-router-dom";

/**
 * Legacy `/staff/payouts` → Pagos hub Configurar tab.
 * Preserves Stripe Connect return query (`connect=return|refresh`).
 */
export default function StaffPayoutsRedirect() {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  next.set("tab", "setup");
  // Drop obsolete Mercado Pago OAuth return flags.
  next.delete("mp");
  const qs = next.toString();
  return <Navigate to={`/staff/payments?${qs}`} replace />;
}
