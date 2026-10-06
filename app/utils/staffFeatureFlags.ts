/** Staff portal: simulation events + Stripe test checkout sandbox. Default off in prod UI. */
export function isStaffSimulationsEnabled(): boolean {
  const raw = import.meta.env.VITE_STAFF_SIMULATIONS_ENABLED;
  return raw === "true" || raw === "1";
}
