import { useState } from "react";
import { Search, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Profissionais() {
  const { toast } = useToast();
  const [editingProfessional, setEditingProfessional] = useState<number | null>(null);
  const [professionalInfo, setProfessionalInfo] = useState("");

  // Mock data for professionals
  const professionals = [
    {
      id: 1,
      name: "Dr. João Silva",
      specialty: "Cardiologista",
      avatar: "JS",
      hasInfo: true,
      infoPreview: "Especialista em arritmias cardíacas com mais de 15 anos de experiência...",
      lastUpdated: "20/01/2025"
    },
    {
      id: 2,
      name: "Dra. Maria Santos",
      specialty: "Clínico Geral",
      avatar: "MS",
      hasInfo: false,
      infoPreview: null,
      lastUpdated: null
    },
    {
      id: 3,
      name: "Dr. Carlos Lima",
      specialty: "Pediatria",
      avatar: "CL",
      hasInfo: true,
      infoPreview: "Atendimento especializado em pediatria, com foco em desenvolvimento infantil...",
      lastUpdated: "18/01/2025"
    },
    {
      id: 4,
      name: "Dra. Ana Costa",
      specialty: "Ginecologia",
      avatar: "AC",
      hasInfo: false,
      infoPreview: null,
      lastUpdated: null
    }
  ];

  const handleSaveProfessionalInfo = (professionalId: number) => {
    toast({
      title: "Informações salvas",
      description: "As informações do profissional foram atualizadas com sucesso.",
      variant: "default",
    });
    setEditingProfessional(null);
    setProfessionalInfo("");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profissionais</h1>
        <p className="text-gray-600">
          Adicione informações específicas sobre cada profissional para personalizar o atendimento da IA
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar profissional..." className="pl-9" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Especialidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as especialidades</SelectItem>
            <SelectItem value="cardiologia">Cardiologia</SelectItem>
            <SelectItem value="clinico-geral">Clínico Geral</SelectItem>
            <SelectItem value="pediatria">Pediatria</SelectItem>
            <SelectItem value="ginecologia">Ginecologia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Professionals List */}
      <div className="space-y-4">
        {professionals.map((professional) => (
          <Card key={professional.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                  {professional.avatar}
                </div>

                {/* Professional Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{professional.name}</h4>
                    <Badge variant={professional.hasInfo ? "default" : "secondary"}>
                      {professional.hasInfo ? "Com informações" : "Precisa de informações"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{professional.specialty}</p>

                  {/* Information Preview */}
                  {professional.hasInfo && professional.infoPreview ? (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 line-clamp-2">{professional.infoPreview}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Última atualização: {professional.lastUpdated}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">
                      Nenhuma informação adicionada ainda.
                    </p>
                  )}

                  {/* Edit Form */}
                  {editingProfessional === professional.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={professionalInfo}
                        onChange={(e) => setProfessionalInfo(e.target.value)}
                        placeholder={`Inclua informações sobre ${professional.name} como: especialidades detalhadas, abordagem de atendimento, protocolos específicos, horários preferenciais, ou qualquer informação relevante para personalizar o atendimento da IA.`}
                        className="min-h-[120px]"
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveProfessionalInfo(professional.id)}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Informações
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setEditingProfessional(null);
                            setProfessionalInfo("");
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingProfessional(professional.id);
                        setProfessionalInfo(professional.infoPreview || "");
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {professional.hasInfo ? "Editar Informações" : "Adicionar Informações"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}