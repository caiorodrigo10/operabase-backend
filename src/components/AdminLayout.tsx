import { ReactNode } from "react";
import { Header } from "./Header";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Use the same Header component with admin navigation */}
      <Header 
        currentPage="admin" 
        onMenuClick={() => {}} 
        isMobile={false} 
      />
      
      {/* Main Content with top padding for fixed header */}
      <main className="pt-20 px-4 lg:px-6">
        {children}
      </main>
    </div>
  );
}