import React from "react";
import { 
  Menu, 
  LogOut, 
  User, 
  Search, 
  MessageCircle, 
  Settings,
  Stethoscope,
  Building,
  LayoutGrid,
  Filter,
  Bot,
  Megaphone,
  BarChart3,
  Home,
  Calendar,
  Users,
  Activity
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/contexts/AdminContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { SearchModal } from "./SearchModal";
import { useState } from "react";

interface HeaderProps {
  currentPage: string;
  onMenuClick: () => void;
  isMobile: boolean;
}

// Navigation items for the new horizontal menu
const navigationItems = [
  { name: "Agenda", href: "/", key: "consultas", icon: Calendar },
  { name: "Pacientes", href: "/contatos", key: "contatos", icon: Users },
];

// Admin navigation items
const adminNavigationItems = [
  { name: "Dashboard", href: "/admin", key: "admin-dashboard", icon: Home },
  { name: "Clínicas", href: "/admin/clinics", key: "admin-clinics", icon: Building },
  { name: "Usuários", href: "/admin/users", key: "admin-users", icon: Users },
  { name: "Configurações", href: "/admin/settings", key: "admin-settings", icon: Settings },
];

// Right side icon buttons
const iconButtons = [
  { 
    icon: Search, 
    tooltip: "Procurar Pacientes", 
    href: "/contatos",
    active: true,
    isSearch: true
  },
  { 
    icon: MessageCircle, 
    tooltip: "Conversas", 
    href: "/conversas",
    active: true 
  },
  { 
    icon: Settings, 
    tooltip: "Configurações Gerais", 
    href: "/configuracoes/clinica",
    active: true 
  },
];

// Admin icon buttons
const adminIconButtons = [
  { 
    icon: Search, 
    tooltip: "Buscar no Sistema", 
    href: "#",
    active: false,
    isSearch: true
  },
  { 
    icon: Settings, 
    tooltip: "Configurações Admin", 
    href: "/admin/settings",
    active: true 
  },
];

export function Header({ currentPage, onMenuClick, isMobile }: HeaderProps) {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const { isAdminView, toggleAdminView } = useAdmin();
  const { toast } = useToast();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAppsDropdownOpen, setIsAppsDropdownOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado do sistema",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no logout",
        description: error.message || "Erro ao fazer logout",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleInactiveClick = (tooltip: string) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: `${tooltip} estará disponível em breve`,
      variant: "default",
    });
  };

  return (
    <TooltipProvider>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Left Navigation */}
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <Link href={isAdminView ? "/admin" : "/"} className="flex items-center">
              <img 
                src="https://lkwrevhxugaxfpwiktdy.supabase.co/storage/v1/object/sign/docsgerais/operabaselogo.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82ZGMzM2E3My1kMjMyLTQwNTgtOWZkYi02ODBjZmZkMWY2MmEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkb2NzZ2VyYWlzL29wZXJhYmFzZWxvZ28uc3ZnIiwiaWF0IjoxNzUwOTkxMzg4LCJleHAiOjE3ODI1MjczODh9.idPoup3H2OxyHM6fY6Vxbt5iMAMdHY7nNiu8rpGfTPk" 
                alt="Operabase Logo" 
                className="h-10 w-auto object-contain"
              />
              {isAdminView && (
                <span className="text-xs text-orange-600 font-medium ml-2">
                  Admin Panel
                </span>
              )}
            </Link>

            {/* Main Navigation - Hidden on mobile */}
            <nav className="hidden md:flex items-center space-x-2">
              {(isAdminView ? adminNavigationItems : navigationItems).map((item) => {
                const isActive = location === item.href || 
                  (item.key === "consultas" && location === "/") ||
                  (item.key === "admin-dashboard" && location === "/admin") ||
                  (item.key === "contatos" && location.startsWith("/contatos")) ||
                  (item.key === "consultas" && location.startsWith("/consultas")) ||
                  (item.key === "anamneses" && location.startsWith("/anamneses")) ||
                  (item.key === "admin-clinics" && location.startsWith("/admin/clinics")) ||
                  (item.key === "admin-users" && location.startsWith("/admin/users")) ||
                  (item.key === "admin-settings" && location.startsWith("/admin/settings"));
                
                const Icon = (item as any).icon;
                
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "text-slate-900 bg-[#f3f4f6]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Apps Dropdown - Only show in regular view */}
            {!isAdminView && (
              <div className="hidden md:block">
                <DropdownMenu open={isAppsDropdownOpen} onOpenChange={setIsAppsDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100 data-[state=open]:bg-slate-100 border-0"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="w-80 p-4" 
                    align="center"
                    side="bottom"
                    sideOffset={8}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <Link
                        href="/funis"
                        className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors min-h-[80px]"
                        onClick={() => {
                          setIsAppsDropdownOpen(false);
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
                          <Filter className="h-5 w-5 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-900 text-center">Funis</span>
                      </Link>

                      <Link
                        href="/trabalhadores-digitais"
                        className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors min-h-[80px]"
                        onClick={() => {
                          setIsAppsDropdownOpen(false);
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
                          <Bot className="h-5 w-5 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-900 text-center">Trabalhadores Digitais</span>
                      </Link>

                      <div 
                        className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors min-h-[80px]"
                        onClick={() => {
                          setIsAppsDropdownOpen(false);
                          toast({
                            title: "Funcionalidade em desenvolvimento",
                            description: "Campanhas Automáticas estará disponível em breve",
                            variant: "default",
                          });
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
                          <Megaphone className="h-5 w-5 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-900 text-center">Campanhas Automáticas</span>
                      </div>

                      <Link
                        href="/relatorios"
                        className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors min-h-[80px]"
                        onClick={() => setIsAppsDropdownOpen(false)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
                          <BarChart3 className="h-5 w-5 text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-900 text-center">Relatórios</span>
                      </Link>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={onMenuClick}
                className="p-2 rounded-md text-slate-400 hover:text-slate-600 md:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Right Side Icons and User Menu */}
          <div className="flex items-center space-x-3">
            {/* Icon Buttons */}
            <div className="hidden sm:flex items-center space-x-2">
              {(isAdminView ? adminIconButtons : iconButtons).map((button, index) => {
                const Icon = button.icon;
                
                if (!button.active) {
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          onClick={() => handleInactiveClick(button.tooltip)}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{button.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                // Special handling for search button
                if (button.isSearch) {
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          onClick={() => setIsSearchModalOpen(true)}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{button.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        asChild
                      >
                        <Link href={button.href}>
                          <Icon className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{button.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-teal-600 hover:bg-teal-700">
                    <span className="text-white text-sm font-medium">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/perfil" className="flex items-center w-full">
                      <User className="mr-2 h-4 w-4" />
                      <span>Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Admin Panel Toggle - Only show for admin users */}
                  {(user?.role === 'super_admin' || user?.role === 'admin') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={toggleAdminView}
                        className="flex items-center w-full"
                      >
                        {isAdminView ? (
                          <>
                            <Building className="mr-2 h-4 w-4" />
                            <span>Painel Usuário</span>
                          </>
                        ) : (
                          <>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Painel Admin</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? "Saindo..." : "Sair"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobile && (
          <nav className="mt-3 pt-3 border-t border-slate-200 md:hidden">
            <div className="flex space-x-4 mb-3">
              {(isAdminView ? adminNavigationItems : navigationItems).map((item) => {
                const isActive = location === item.href || 
                  (item.key === "consultas" && location === "/") ||
                  (item.key === "admin-dashboard" && location === "/admin") ||
                  (item.key === "contatos" && location.startsWith("/contatos")) ||
                  (item.key === "consultas" && location.startsWith("/consultas")) ||
                  (item.key === "admin-clinics" && location.startsWith("/admin/clinics")) ||
                  (item.key === "admin-users" && location.startsWith("/admin/users")) ||
                  (item.key === "admin-settings" && location.startsWith("/admin/settings"));
                
                const Icon = (item as any).icon;
                
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-teal-100 text-teal-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Apps Grid - Only show in regular view */}
            {!isAdminView && (
              <div className="pt-3 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/funis"
                    className="flex flex-col items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-1">
                      <Filter className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-900">Funis</span>
                  </Link>

                  <div 
                    className="flex flex-col items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => {
                      toast({
                        title: "Funcionalidade em desenvolvimento",
                        description: "Trabalhadores Digitais estará disponível em breve",
                        variant: "default",
                      });
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-1">
                      <Bot className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-900">Digitais</span>
                  </div>

                  <div 
                    className="flex flex-col items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => {
                      toast({
                        title: "Funcionalidade em desenvolvimento",
                        description: "Campanhas Automáticas estará disponível em breve",
                        variant: "default",
                      });
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-1">
                      <Megaphone className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-900">Campanhas</span>
                  </div>

                  <Link
                    href="/relatorios"
                    className="flex flex-col items-center p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-1">
                      <BarChart3 className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-900">Relatórios</span>
                  </Link>
                </div>
              </div>
            )}
          </nav>
        )}

        {/* Search Modal */}
        <SearchModal 
          isOpen={isSearchModalOpen} 
          onClose={() => setIsSearchModalOpen(false)} 
        />
      </header>
    </TooltipProvider>
  );
}
