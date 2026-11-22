"use client";

import { RequireAuth } from "@/components/require-auth";
import { AdminDashboard } from "./admin-dashboard";

export default function AdminPage() {
  return <RequireAuth role="admin">{(user) => <AdminDashboard me={user} />}</RequireAuth>;
}
