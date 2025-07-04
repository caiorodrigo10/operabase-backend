import { useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload,
  File,
  Image,
  FileAudio,
  FileVideo,
  Download,
  Eye,
  Trash2,
  Search,
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ContactLayout } from "@/components/ContactLayout";

interface FileItem {
  id: number;
  name: string;
  type: 'image' | 'audio' | 'video' | 'document';
  mimeType: string;
  size: string;
  uploadDate: string;
  uploadedBy: string;
  source: 'whatsapp' | 'upload' | 'system';
  url?: string;
}

const mockFiles: FileItem[] = [
  {
    id: 1,
    name: "imagem_exame_2025.jpg",
    type: "image",
    mimeType: "image/jpeg",
    size: "2.3 MB",
    uploadDate: "2025-06-28T10:30:00",
    uploadedBy: "Paciente",
    source: "whatsapp",
    url: "/api/files/1"
  },
  {
    id: 2,
    name: "audio_sintomas.ogg",
    type: "audio",
    mimeType: "audio/ogg",
    size: "1.1 MB",
    uploadDate: "2025-06-27T14:15:00",
    uploadedBy: "Paciente",
    source: "whatsapp",
    url: "/api/files/2"
  },
  {
    id: 3,
    name: "receita_medica.pdf",
    type: "document",
    mimeType: "application/pdf",
    size: "0.8 MB",
    uploadDate: "2025-06-25T09:45:00",
    uploadedBy: "Dr. Caio Rodrigo",
    source: "upload",
    url: "/api/files/3"
  }
];

const getFileIcon = (type: string) => {
  switch (type) {
    case 'image':
      return <Image className="w-6 h-6 text-blue-600" />;
    case 'audio':
      return <FileAudio className="w-6 h-6 text-green-600" />;
    case 'video':
      return <FileVideo className="w-6 h-6 text-purple-600" />;
    default:
      return <File className="w-6 h-6 text-slate-600" />;
  }
};

const getSourceBadge = (source: string) => {
  switch (source) {
    case 'whatsapp':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">WhatsApp</Badge>;
    case 'upload':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Upload</Badge>;
    case 'system':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Sistema</Badge>;
    default:
      return <Badge variant="outline">{source}</Badge>;
  }
};

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'image':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Imagem</Badge>;
    case 'audio':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Áudio</Badge>;
    case 'video':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Vídeo</Badge>;
    case 'document':
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Documento</Badge>;
    default:
      return <Badge variant="outline">Arquivo</Badge>;
  }
};

export default function ContatoArquivos() {
  const { id } = useParams<{ id: string }>();
  const contactId = parseInt(id || '0');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [files] = useState<FileItem[]>(mockFiles);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || file.type === selectedType;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ContactLayout currentTab="arquivos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Arquivos</h1>
            <p className="text-slate-600 mt-1">Imagens, áudios, vídeos e documentos compartilhados pelo paciente</p>
          </div>
          <Button className="bg-[#0f766e] hover:bg-teal-700 text-white">
            <Upload className="w-4 h-4 mr-2" />
            Enviar Arquivo
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar arquivos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="all">Todos os tipos</option>
                <option value="image">Imagens</option>
                <option value="audio">Áudios</option>
                <option value="video">Vídeos</option>
                <option value="document">Documentos</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Files Grid */}
        {filteredFiles.length === 0 ? (
          <Card className="border border-slate-200">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-[#0f766e]" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {searchTerm || selectedType !== 'all' ? 'Nenhum arquivo encontrado' : 'Nenhum arquivo compartilhado'}
                </h3>
                <p className="text-slate-500 mb-6">
                  {searchTerm || selectedType !== 'all'
                    ? 'Tente uma busca diferente ou altere os filtros aplicados.'
                    : 'Este paciente ainda não compartilhou nenhum arquivo. Arquivos recebidos via WhatsApp aparecerão aqui automaticamente.'
                  }
                </p>
                {!searchTerm && selectedType === 'all' && (
                  <Button className="bg-[#0f766e] hover:bg-teal-700 text-white">
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar primeiro arquivo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="border border-slate-200 hover:border-slate-300 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-slate-900 break-all">
                            {file.name}
                          </h3>
                          {getTypeBadge(file.type)}
                          {getSourceBadge(file.source)}
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p><strong>Tipo:</strong> {file.mimeType}</p>
                          <p><strong>Tamanho:</strong> {file.size}</p>
                          <p><strong>Enviado por:</strong> {file.uploadedBy}</p>
                          <p><strong>Data:</strong> {formatDate(file.uploadDate)}</p>
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
                  {files.length}
                </div>
                <div className="text-sm text-slate-600">Total de Arquivos</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {files.filter(f => f.type === 'image').length}
                </div>
                <div className="text-sm text-slate-600">Imagens</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {files.filter(f => f.type === 'audio').length}
                </div>
                <div className="text-sm text-slate-600">Áudios</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {files.filter(f => f.type === 'document').length}
                </div>
                <div className="text-sm text-slate-600">Documentos</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ContactLayout>
  );
}