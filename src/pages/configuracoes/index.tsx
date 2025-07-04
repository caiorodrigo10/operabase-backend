import { Building2, Users, Plug, CreditCard, FileText } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface ConfiguracoesLayoutProps {
  children: React.ReactNode;
}

const ConfiguracoesLayout = ({ children }: ConfiguracoesLayoutProps) => {
  const [location] = useLocation();
  
  const sidebarItems = [
    {
      id: 'clinica',
      label: 'Clínica',
      icon: Building2,
      href: '/configuracoes/clinica',
    },
    {
      id: 'equipe',
      label: 'Equipe',
      icon: Users,
      href: '/configuracoes/equipe',
    },
    {
      id: 'integracoes',
      label: 'Integrações',
      icon: Plug,
      href: '/configuracoes/integracoes',
    },
    {
      id: 'planos',
      label: 'Planos',
      icon: CreditCard,
      href: '/configuracoes/planos',
    },
    {
      id: 'anamneses',
      label: 'Anamneses',
      icon: FileText,
      href: '/configuracoes/anamneses',
    },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <nav className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <Link key={item.id} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                        isActive
                          ? "bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-100"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function ConfiguracoesIndex() {
  const [location, setLocation] = useLocation();
  
  // Redirect to clinic page by default using React navigation
  if (location === '/configuracoes' || location === '/configuracoes/') {
    setLocation('/configuracoes/clinica');
    return null;
  }
  
  return <ConfiguracoesLayout>
    <div className="text-center py-8">
      <p className="text-slate-600">Selecione uma opção no menu lateral para começar.</p>
    </div>
  </ConfiguracoesLayout>;
}

export { ConfiguracoesLayout };