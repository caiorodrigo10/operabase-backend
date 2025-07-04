import { Bot, Users, BarChart3, BookOpen, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
export default function TrabalhadoresesDigitais() {

  const assistants = [
    {
      name: "Lívia",
      role: "Secretária Digital",
      description: "Especialista em atendimento ao paciente, agendamentos e organização da agenda médica",
      icon: Users,
      color: "blue",
      specialties: [
        "Agendamento automático de consultas",
        "Atendimento inicial via WhatsApp",
        "Gerenciamento de horários",
        "Lembretes e confirmações"
      ]
    },
    {
      name: "Iago",
      role: "Gestor de Tráfego",
      description: "Especialista em marketing digital, campanhas automatizadas e aquisição de novos pacientes",
      icon: BarChart3,
      color: "purple",
      specialties: [
        "Campanhas automatizadas no WhatsApp",
        "Segmentação de pacientes",
        "Follow-up pós-consulta",
        "Reativação de pacientes inativos"
      ]
    },
    {
      name: "Mara",
      role: "Assistente Profissional",
      description: "Especialista em suporte médico, protocolos clínicos e otimização de processos internos",
      icon: Bot,
      color: "green",
      specialties: [
        "Protocolos médicos automatizados",
        "Gestão de prontuários",
        "Relatórios e métricas",
        "Compliance e regulamentações"
      ]
    }
  ];

  const knowledgeBase = {
    name: "Base de Conhecimento",
    description: "Central de treinamento, configuração e aprimoramento dos assistentes de IA",
    icon: BookOpen,
    color: "orange",
    features: [
      "Biblioteca de protocolos médicos",
      "Templates de conversa personalizáveis",
      "Configurações de especialidade",
      "Histórico de aprendizado"
    ]
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: "bg-blue-50",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        border: "border-blue-200"
      },
      purple: {
        bg: "bg-purple-50",
        iconBg: "bg-purple-100",
        iconColor: "text-purple-600",
        border: "border-purple-200"
      },
      green: {
        bg: "bg-green-50",
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
        border: "border-green-200"
      },
      orange: {
        bg: "bg-orange-50",
        iconBg: "bg-orange-100",
        iconColor: "text-orange-600",
        border: "border-orange-200"
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Page Header */}
      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full bg-white/70 hover:bg-white shadow-sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Trabalhadores Digitais
            </h1>
            <p className="text-gray-600 mt-1">
              Assistentes de IA especializados para automatizar sua clínica
            </p>
          </div>
        </div>

        {/* Grid Layout - 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Assistant Cards */}
          {assistants.map((assistant, index) => {
            const colors = getColorClasses(assistant.color);
            const Icon = assistant.icon;

            return (
              <div
                key={index}
                className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-8 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer h-80 flex flex-col hover:scale-[1.02] hover:bg-white/90"

              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 ${colors.bg} rounded-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300`}></div>
                
                {/* Icon positioned in top right corner */}
                <div className={`absolute top-4 right-4 w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110`}>
                  <Icon className={`h-6 w-6 ${colors.iconColor}`} />
                </div>
                
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center items-center text-center h-full">
                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">
                    {assistant.name}
                  </h3>
                  <p className="text-base font-medium text-gray-600 mb-4">{assistant.role}</p>

                  {/* Description */}
                  <p className="text-sm text-gray-500 mb-8 line-clamp-3 leading-relaxed max-w-sm flex-1 flex items-center">
                    {assistant.description}
                  </p>

                  {/* Footer */}
                  {assistant.name === "Mara" ? (
                    <Link href="/trabalhadores-digitais/mara-ai" className="inline-block">
                      <Button className="px-8 py-2 font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white border-0">
                        Configurar {assistant.name}
                      </Button>
                    </Link>
                  ) : assistant.name === "Lívia" ? (
                    <Link href="/livia-configuration" className="inline-block">
                      <Button className="px-8 py-2 font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white border-0">
                        Configurar {assistant.name}
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      className="px-8 py-2 font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:scale-105 bg-gray-400 hover:bg-gray-500 text-white border-0"
                      disabled
                    >
                      Em breve
                    </Button>
                  )}
                </div>
              </div>
            );
          })}


          {/* Knowledge Base Card */}
          <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-8 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 cursor-pointer h-80 flex flex-col hover:scale-[1.02] hover:bg-white/90">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-orange-50 rounded-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
            
            {/* Icon positioned in top right corner */}
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
              <BookOpen className="h-6 w-6 text-orange-600" />
            </div>
            
            {/* Content */}
            <div className="relative z-10 flex flex-col justify-center items-center text-center h-full">
              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">
                {knowledgeBase.name}
              </h3>
              <p className="text-base font-medium text-gray-600 mb-4">Central de Treinamento</p>

              {/* Description */}
              <p className="text-sm text-gray-500 mb-8 line-clamp-3 leading-relaxed max-w-sm flex-1 flex items-center">
                {knowledgeBase.description}
              </p>

              <Link href="/base-conhecimento" className="inline-block">
                <Button className="px-8 py-2 font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white border-0">
                  Acessar Base de Conhecimento
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}