import { useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ContactLayout } from "@/components/ContactLayout";

interface Document {
  id: number;
  name: string;
  type: string;
  size: string;
  date: string;
  status: 'draft' | 'completed' | 'shared';
  category: 'anamnesis' | 'prescription' | 'report' | 'exam' | 'other';
}

const mockDocuments: Document[] = [
  {
    id: 1,
    name: "Anamnese Inicial",
    type: "PDF",
    size: "2.3 MB",
    date: "2025-06-28",
    status: "completed",
    category: "anamnesis"
  },
  {
    id: 2,
    name: "Receita Médica",
    type: "PDF",
    size: "1.1 MB",
    date: "2025-06-25",
    status: "shared",
    category: "prescription"
  },
  {
    id: 3,
    name: "Relatório de Consulta",
    type: "DOC",
    size: "0.8 MB",
    date: "2025-06-20",
    status: "draft",
    category: "report"
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Concluído</Badge>;
    case 'draft':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Rascunho</Badge>;
    case 'shared':
      return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Compartilhado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getCategoryBadge = (category: string) => {
  switch (category) {
    case 'anamnesis':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Anamnese</Badge>;
    case 'prescription':
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Receita</Badge>;
    case 'report':
      return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">Relatório</Badge>;
    case 'exam':
      return <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">Exame</Badge>;
    default:
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Outro</Badge>;
  }
};

export default function ContatoDocumentos() {
  const { id } = useParams<{ id: string }>();
  const contactId = parseInt(id || '0');
  const [searchTerm, setSearchTerm] = useState('');
  const [documents] = useState<Document[]>(mockDocuments);

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ContactLayout currentTab="documentos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Documentos</h1>
            <p className="text-slate-600 mt-1">Documentos médicos, receitas, relatórios e anamneses do paciente</p>
          </div>
          <Button className="bg-[#0f766e] hover:bg-teal-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo Documento
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline">
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <Card className="border border-slate-200">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-[#0f766e]" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {searchTerm ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}
                </h3>
                <p className="text-slate-500 mb-6">
                  {searchTerm 
                    ? 'Tente uma busca diferente ou verifique os filtros aplicados.'
                    : 'Este paciente ainda não possui documentos registrados. Adicione documentos como anamneses, receitas e relatórios.'
                  }
                </p>
                {!searchTerm && (
                  <Button className="bg-[#0f766e] hover:bg-teal-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar primeiro documento
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredDocuments.map((document) => (
              <Card key={document.id} className="border border-slate-200 hover:border-slate-300 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-[#0f766e] bg-opacity-10 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#0f766e]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {document.name}
                          </h3>
                          {getStatusBadge(document.status)}
                          {getCategoryBadge(document.category)}
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p><strong>Tipo:</strong> {document.type}</p>
                          <p><strong>Tamanho:</strong> {document.size}</p>
                          <p><strong>Data:</strong> {new Date(document.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm" title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" title="Download">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" title="Editar">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" title="Excluir" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#0f766e]">
                  {documents.length}
                </div>
                <div className="text-sm text-slate-600">Total de Documentos</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {documents.filter(d => d.status === 'completed').length}
                </div>
                <div className="text-sm text-slate-600">Concluídos</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {documents.filter(d => d.status === 'shared').length}
                </div>
                <div className="text-sm text-slate-600">Compartilhados</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {documents.filter(d => d.status === 'draft').length}
                </div>
                <div className="text-sm text-slate-600">Rascunhos</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ContactLayout>
  );
}