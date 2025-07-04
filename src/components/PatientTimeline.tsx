import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Filter, Search, Edit, Eye } from "lucide-react";

interface ConsultationRecord {
  id: number;
  date: Date;
  diagnosis: string;
  tags: string[];
  type: string;
  summary: string;
  doctor: string;
}

interface TimelineFilters {
  dateRange: string;
  consultationType: string;
  diagnosis: string;
  searchTerm: string;
}

const mockConsultations: ConsultationRecord[] = [
  {
    id: 1,
    date: new Date("2025-06-12"),
    diagnosis: "Consulta de Rotina",
    tags: ["check-up", "preventivo"],
    type: "consulta",
    summary: "Avaliação geral de saúde. Paciente apresenta bom estado geral.",
    doctor: "Dr. João Silva"
  },
  {
    id: 2,
    date: new Date("2025-05-15"),
    diagnosis: "Ansiedade Generalizada",
    tags: ["ansiedade", "terapia-cognitiva"],
    type: "terapia",
    summary: "Sessão de terapia cognitivo-comportamental. Evolução positiva no controle da ansiedade.",
    doctor: "Dr. João Silva"
  },
  {
    id: 3,
    date: new Date("2025-04-20"),
    diagnosis: "Avaliação Inicial",
    tags: ["primeira-consulta", "anamnese"],
    type: "avaliacao",
    summary: "Primeira consulta. Anamnese completa realizada. Estabelecido plano terapêutico.",
    doctor: "Dr. João Silva"
  }
];

export function PatientTimeline({ patientId }: { patientId: number }) {
  const [consultations] = useState<ConsultationRecord[]>(mockConsultations);
  const [filters, setFilters] = useState<TimelineFilters>({
    dateRange: "all",
    consultationType: "all",
    diagnosis: "all",
    searchTerm: ""
  });

  // Filtrar consultas baseado nos filtros aplicados
  const filteredConsultations = consultations.filter(consultation => {
    const matchesSearch = filters.searchTerm === "" || 
      consultation.diagnosis.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      consultation.summary.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      consultation.tags.some(tag => tag.toLowerCase().includes(filters.searchTerm.toLowerCase()));

    const matchesType = filters.consultationType === "all" || 
      consultation.type === filters.consultationType;

    const matchesDateRange = (() => {
      if (filters.dateRange === "all") return true;
      
      const now = new Date();
      const consultationDate = consultation.date;
      
      switch (filters.dateRange) {
        case "last30":
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return consultationDate >= thirtyDaysAgo;
        case "last90":
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          return consultationDate >= ninetyDaysAgo;
        case "thisYear":
          return consultationDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    })();

    return matchesSearch && matchesType && matchesDateRange;
  });

  // Obter diagnósticos únicos para o filtro
  const uniqueDiagnoses = Array.from(new Set(consultations.map(c => c.diagnosis)));

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      "check-up": "bg-green-100 text-green-800",
      "preventivo": "bg-teal-100 text-teal-800",
      "ansiedade": "bg-yellow-100 text-yellow-800",
      "terapia-cognitiva": "bg-purple-100 text-purple-800",
      "primeira-consulta": "bg-indigo-100 text-indigo-800",
      "anamnese": "bg-gray-100 text-gray-800"
    };
    return colors[tag] || "bg-gray-100 text-gray-600";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "consulta":
        return "🩺";
      case "terapia":
        return "🧠";
      case "avaliacao":
        return "📋";
      case "retorno":
        return "🔄";
      default:
        return "📄";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Buscar por diagnóstico ou conteúdo..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Período</label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="last30">Últimos 30 dias</SelectItem>
                  <SelectItem value="last90">Últimos 90 dias</SelectItem>
                  <SelectItem value="thisYear">Este ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Tipo de Consulta</label>
              <Select 
                value={filters.consultationType} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, consultationType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="consulta">Consulta</SelectItem>
                  <SelectItem value="terapia">Terapia</SelectItem>
                  <SelectItem value="avaliacao">Avaliação</SelectItem>
                  <SelectItem value="retorno">Retorno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Diagnóstico</label>
              <Select 
                value={filters.diagnosis} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, diagnosis: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os diagnósticos</SelectItem>
                  {uniqueDiagnoses.map(diagnosis => (
                    <SelectItem key={diagnosis} value={diagnosis}>
                      {diagnosis}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline de Consultas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Histórico de Consultas ({filteredConsultations.length})
          </h3>
        </div>

        {filteredConsultations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma consulta encontrada com os filtros aplicados.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredConsultations.map((consultation, index) => (
              <Card key={consultation.id} className="relative">
                {/* Linha de conexão da timeline */}
                {index < filteredConsultations.length - 1 && (
                  <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -mb-4" />
                )}
                
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Ícone da timeline */}
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-sm relative z-10">
                      {getTypeIcon(consultation.type)}
                    </div>

                    {/* Conteúdo da consulta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {consultation.diagnosis}
                          </h4>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <Calendar className="h-4 w-4 mr-1" />
                            {format(consultation.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            <span className="mx-2">•</span>
                            <span>{consultation.doctor}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {consultation.tags.map(tag => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className={`text-xs ${getTagColor(tag)}`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Resumo */}
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                        {consultation.summary}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}