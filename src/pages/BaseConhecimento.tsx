import { ChevronLeft, BookOpen, Users, Building } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import BasesConhecimento from "./base-conhecimento/BasesConhecimento";
import ColecaoDetalhe from "./base-conhecimento/ColecaoDetalhe";
import Profissionais from "./base-conhecimento/Profissionais";
import Empresa from "./base-conhecimento/Empresa";

export default function BaseConhecimento() {
  const [location] = useLocation();

  // Determine active section from URL or default to bases
  const currentSection = location.includes("/base-conhecimento/") 
    ? location.split("/base-conhecimento/")[1] || "bases"
    : "bases";

  const navigationItems = [
    {
      key: "bases",
      name: "Bases de Conhecimento",
      icon: BookOpen,
      href: "/base-conhecimento"
    },
    {
      key: "profissionais",
      name: "Profissionais", 
      icon: Users,
      href: "/base-conhecimento/profissionais"
    },
    {
      key: "empresa",
      name: "Empresa",
      icon: Building,
      href: "/base-conhecimento/empresa"
    }
  ];

  const renderContent = () => {
    // Check if this is a collection detail page (numeric ID)
    if (currentSection && /^\d+$/.test(currentSection)) {
      return <ColecaoDetalhe />;
    }
    
    switch (currentSection) {
      case "profissionais":
        return <Profissionais />;
      case "empresa":
        return <Empresa />;
      default:
        return <BasesConhecimento />;
    }
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/trabalhadores-digitais">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Base de Conhecimento</h1>
          <p className="text-gray-600">
            Treine seus assistentes de IA com informações personalizadas
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === currentSection;
                
                return (
                  <Link key={item.key} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}