import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  GitBranch, 
  Users, 
  Settings,
  Stethoscope,
  X,
  Calendar,
  Bot,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentPage: string;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3, route: "dashboard" },
  { name: "Pipeline", href: "/pipeline", icon: GitBranch, route: "pipeline" },
  { name: "Consultas", href: "/consultas", icon: Calendar, route: "consultas" },
  { name: "Contatos", href: "/contatos", icon: Users, route: "contatos" },
  { name: "Conversas", href: "/conversas", icon: MessageSquare, route: "conversas" },
  { name: "Configurações", href: "/configuracoes", icon: Settings, route: "configuracoes" },
];

export function Sidebar({ currentPage, isMobile, isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

  const sidebarClasses = cn(
    "flex flex-col w-64 bg-white border-r border-slate-200",
    isMobile ? cn(
      "fixed inset-y-0 left-0 z-30 transform transition-transform duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full"
    ) : "hidden lg:flex lg:flex-shrink-0"
  );

  return (
    <aside className={sidebarClasses}>
      {/* Logo Section */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-medical-blue rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-800">Taskmed</span>
        </div>
        {isMobile && (
          <button 
            onClick={onClose}
            className="p-2 rounded-md text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={isMobile ? onClose : undefined}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-medical-blue text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* AI Status */}
      <div className="p-4 border-t border-slate-200">
        <Link href="/livia-config">
          <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            <div className="w-3 h-3 bg-medical-green rounded-full animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">Livia IA</p>
              <p className="text-xs text-slate-500">Online e ativa</p>
            </div>
            <Bot className="w-4 h-4 text-medical-green" />
          </div>
        </Link>
      </div>
    </aside>
  );
}