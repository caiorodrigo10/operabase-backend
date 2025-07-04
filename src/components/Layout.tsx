import { Header } from "./Header";
import { useMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

export function Layout({ children, currentPage }: LayoutProps) {
  const isMobile = useMobile();

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header 
        currentPage={currentPage} 
        onMenuClick={() => {}} // No longer needed but keeping for compatibility
        isMobile={isMobile}
      />
      <main className="flex-1 overflow-auto pt-20">
        {children}
      </main>
    </div>
  );
}
