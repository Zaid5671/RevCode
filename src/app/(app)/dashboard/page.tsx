import { Dashboard } from "@/components/Dashboard";
import { requireSession } from "@/server/session";

export const metadata = { title: "Dashboard · RevCode" };

// Layouts don't re-run on every navigation, so each page checks the session itself as well.
export default async function DashboardPage() {
  await requireSession();
  return <Dashboard />;
}
