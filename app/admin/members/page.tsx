"use client";

import { AdminSidebar } from "@/components/admin-sidebar";
import { MembersManagement } from "@/components/AdminDashboard";

export default function AdminMembersPage() {
  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <div className="flex-1 lg:ml-0">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 lg:pb-8">
          <MembersManagement />
        </div>
      </div>
    </div>
  );
}
