import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { ConfiguracoesLayout } from './index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  DollarSign, 
  Download, 
  ArrowLeft,
  Trash2,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tratamento {
  id: string;
  nome: string;
  valorTratamento: number;
  custoTratamento: number;
  aceitaConvenio: boolean;
  ativo: boolean;
}

interface Especialidade {
  id: string;
  nome: string;
  tratamentos: Tratamento[];
}

// Dados mockados baseados na imagem
const especialidadesMock: Especialidade[] = [
  {
    id: 'cirurgia',
    nome: 'Cirurgia',
    tratamentos: [
      {
        id: 'alveoloplastia',
        nome: 'Alveoloplastia',
        valorTratamento: 140.00,
        custoTratamento: 0.00,
        aceitaConvenio: true,
        ativo: true
      },
      {
        id: 'amputacao-radicular-obturacao',
        nome: 'Amputação Radicular com Obturação Retrógrada',
        valorTratamento: 270.00,
        custoTratamento: 0.00,
        aceitaConvenio: true,
        ativo: true
      },
      {
        id: 'amputacao-radicular-sem-obturacao',
        nome: 'Amputação Radicular sem Obturação Retrógrada',
        valorTratamento: 200.00,
        custoTratamento: 0.00,
        aceitaConvenio: false,
        ativo: true
      },
      {
        id: 'biopsia-gengival',
        nome: 'Biópsia Gengival',
        valorTratamento: 180.00,
        custoTratamento: 50.00,
        aceitaConvenio: true,
        ativo: false
      }
    ]
  },
  {
    id: 'dentistica',
    nome: 'Dentística',
    tratamentos: [
      {
        id: 'restauracao-resina',
        nome: 'Restauração em Resina Composta',
        valorTratamento: 120.00,
        custoTratamento: 30.00,
        aceitaConvenio: true,
        ativo: true
      },
      {
        id: 'clareamento-dental',
        nome: 'Clareamento Dental',
        valorTratamento: 350.00,
        custoTratamento: 80.00,
        aceitaConvenio: false,
        ativo: true
      }
    ]
  },
  {
    id: 'endodontia',
    nome: 'Endodontia',
    tratamentos: [
      {
        id: 'tratamento-canal',
        nome: 'Tratamento de Canal',
        valorTratamento: 280.00,
        custoTratamento: 60.00,
        aceitaConvenio: true,
        ativo: true
      },
      {
        id: 'retratamento-canal',
        nome: 'Retratamento de Canal',
        valorTratamento: 380.00,
        custoTratamento: 80.00,
        aceitaConvenio: false,
        ativo: false
      }
    ]
  },
  {
    id: 'estetica',
    nome: 'Estética',
    tratamentos: [
      {
        id: 'faceta-porcelana',
        nome: 'Faceta de Porcelana',
        valorTratamento: 800.00,
        custoTratamento: 200.00,
        aceitaConvenio: false,
        ativo: true
      },
      {
        id: 'lente-contato',
        nome: 'Lente de Contato Dental',
        valorTratamento: 1200.00,
        custoTratamento: 300.00,
        aceitaConvenio: false,
        ativo: true
      }
    ]
  },
  {
    id: 'harmonizacao-facial',
    nome: 'Harmonização Facial',
    tratamentos: [
      {
        id: 'botox',
        nome: 'Aplicação de Botox',
        valorTratamento: 450.00,
        custoTratamento: 120.00,
        aceitaConvenio: false,
        ativo: true
      }
    ]
  },
  {
    id: 'implantodontia',
    nome: 'Implantodontia',
    tratamentos: [
      {
        id: 'implante-unitario',
        nome: 'Implante Unitário',
        valorTratamento: 1500.00,
        custoTratamento: 400.00,
        aceitaConvenio: true,
        ativo: true
      }
    ]
  },
  {
    id: 'odontopediatria',
    nome: 'Odontopediatria',
    tratamentos: [
      {
        id: 'selante',
        nome: 'Aplicação de Selante',
        valorTratamento: 80.00,
        custoTratamento: 20.00,
        aceitaConvenio: true,
        ativo: true
      }
    ]
  }
];

export default function PlanoDetalhesPage() {
  const { id: planoId } = useParams() as { id: string };
  const [, setLocation] = useLocation();
  
  const [especialidades, setEspecialidades] = useState<Especialidade[]>(especialidadesMock);
  const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState('cirurgia');
  const [busca, setBusca] = useState('');
  const [planoNome, setPlanoNome] = useState('Particular');
  const [pagoPorConvenio, setPagoPorConvenio] = useState(false);

  // Filtrar especialidades e tratamentos baseado na busca
  const especialidadesFiltradas = especialidades.map(esp => ({
    ...esp,
    tratamentos: esp.tratamentos.filter(trat => 
      trat.nome.toLowerCase().includes(busca.toLowerCase())
    )
  })).filter(esp => 
    esp.nome.toLowerCase().includes(busca.toLowerCase()) || esp.tratamentos.length > 0
  );

  const especialidadeAtual = especialidadesFiltradas.find(esp => esp.id === especialidadeSelecionada);

  const handleTratamentoChange = (especialidadeId: string, tratamentoId: string, field: keyof Tratamento, value: any) => {
    setEspecialidades(prev => prev.map(esp => 
      esp.id === especialidadeId 
        ? {
            ...esp,
            tratamentos: esp.tratamentos.map(trat =>
              trat.id === tratamentoId ? { ...trat, [field]: value } : trat
            )
          }
        : esp
    ));
  };

  const handleVoltar = () => {
    setLocation('/configuracoes/planos');
  };

  const tratamentosAtivos = especialidadeAtual?.tratamentos.filter(t => t.ativo).length || 0;
  const totalTratamentos = especialidadeAtual?.tratamentos.length || 0;

  return (
    <ConfiguracoesLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleVoltar}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h3 className="text-lg font-medium">Plano</h3>
              <p className="text-sm text-muted-foreground">
                Configure os tratamentos e valores do plano
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="text-slate-600">
              <DollarSign className="h-4 w-4 mr-2" />
              Reajustar valores
            </Button>
            <Button variant="outline" size="sm" className="text-slate-600">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Configurações do Plano */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome-plano">Nome do plano*</Label>
                <Input
                  id="nome-plano"
                  value={planoNome}
                  onChange={(e) => setPlanoNome(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-4">
                  <Label className={cn("text-sm", !pagoPorConvenio ? "text-slate-900" : "text-slate-500")}>
                    Pago pelo convênio
                  </Label>
                  <Switch
                    checked={pagoPorConvenio}
                    onCheckedChange={setPagoPorConvenio}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label className={cn("text-sm", pagoPorConvenio ? "text-blue-600" : "text-slate-500")}>
                    Plano padrão
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Especialidades */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Especialidades</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar especialidade..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {especialidadesFiltradas.map((especialidade) => {
                  const ativosNaEsp = especialidade.tratamentos.filter(t => t.ativo).length;
                  const totalNaEsp = especialidade.tratamentos.length;
                  
                  return (
                    <button
                      key={especialidade.id}
                      onClick={() => setEspecialidadeSelecionada(especialidade.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        especialidade.id === especialidadeSelecionada
                          ? "bg-teal-100 text-teal-900"
                          : "hover:bg-slate-100 text-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{especialidade.nome}</span>
                        <Badge variant="secondary" className="text-xs">
                          {ativosNaEsp}/{totalNaEsp}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Área Principal - Tratamentos */}
          <div className="lg:col-span-3 space-y-4">
            {especialidadeAtual && (
              <>
                {/* Header da Especialidade */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-medium">{especialidadeAtual.nome}</h4>
                    <Badge variant="outline" className="text-teal-600 border-teal-200">
                      {tratamentosAtivos} de {totalTratamentos} ativos
                    </Badge>
                  </div>
                  
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar tratamento
                  </Button>
                </div>

                {/* Grid de Tratamentos */}
                <div className="space-y-4">
                  {especialidadeAtual.tratamentos.map((tratamento) => (
                    <Card key={tratamento.id} className={cn(
                      "border",
                      tratamento.ativo ? "border-slate-200" : "border-slate-100 bg-slate-50"
                    )}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={tratamento.aceitaConvenio}
                              onChange={(e) => handleTratamentoChange(
                                especialidadeAtual.id, 
                                tratamento.id, 
                                'aceitaConvenio', 
                                e.target.checked
                              )}
                              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <div>
                              <h5 className="font-medium text-slate-900">{tratamento.nome}</h5>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm text-slate-600">Usar</Label>
                              <Switch
                                checked={tratamento.ativo}
                                onCheckedChange={(checked) => handleTratamentoChange(
                                  especialidadeAtual.id, 
                                  tratamento.id, 
                                  'ativo', 
                                  checked
                                )}
                                className="data-[state=checked]:bg-teal-600"
                              />
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-600">Valor do tratamento</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-slate-500">R$</span>
                              <Input
                                type="number"
                                value={tratamento.valorTratamento}
                                onChange={(e) => handleTratamentoChange(
                                  especialidadeAtual.id, 
                                  tratamento.id, 
                                  'valorTratamento', 
                                  parseFloat(e.target.value) || 0
                                )}
                                className="pl-10"
                                step="0.01"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-600">Custo do tratamento</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-slate-500">R$</span>
                              <Input
                                type="number"
                                value={tratamento.custoTratamento}
                                onChange={(e) => handleTratamentoChange(
                                  especialidadeAtual.id, 
                                  tratamento.id, 
                                  'custoTratamento', 
                                  parseFloat(e.target.value) || 0
                                )}
                                className="pl-10"
                                step="0.01"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {/* Estado vazio */}
            {!especialidadeAtual && (
              <Card className="border-dashed border-2 border-slate-200">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Settings className="h-12 w-12 text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Nenhuma especialidade encontrada
                  </h3>
                  <p className="text-slate-600 text-center">
                    Tente ajustar sua busca ou selecionar uma especialidade diferente.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <Button variant="outline" onClick={handleVoltar}>
            Fechar
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            Salvar
          </Button>
        </div>
      </div>
    </ConfiguracoesLayout>
  );
}