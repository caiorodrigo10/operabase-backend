import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MCPResponse {
  tools?: any[];
  resources?: any[];
  prompts?: any[];
  content?: any[];
  contents?: any[];
  isError?: boolean;
}

export default function MCPTestPage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<MCPResponse | null>(null);
  const [toolName, setToolName] = useState('');
  const [toolArgs, setToolArgs] = useState('{}');
  const [resourceUri, setResourceUri] = useState('');
  const [promptName, setPromptName] = useState('');
  const [promptArgs, setPromptArgs] = useState('{}');

  const testEndpoint = async (endpoint: string, method: string = 'GET', body?: any) => {
    setLoading(true);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(`/api/mcp/${endpoint}`, options);
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({ 
        content: [{ 
          type: 'text', 
          text: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
        }], 
        isError: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const testToolsList = () => testEndpoint('tools/list');
  const testResourcesList = () => testEndpoint('resources/list');
  const testPromptsList = () => testEndpoint('prompts/list');
  const testInitialize = () => testEndpoint('initialize');

  const testToolCall = () => {
    try {
      const args = JSON.parse(toolArgs);
      testEndpoint('tools/call', 'POST', {
        name: toolName,
        arguments: args
      });
    } catch (error) {
      setResponse({ 
        content: [{ 
          type: 'text', 
          text: `Erro no JSON dos argumentos: ${error instanceof Error ? error.message : 'JSON inválido'}` 
        }], 
        isError: true 
      });
    }
  };

  const testResourceRead = () => {
    testEndpoint('resources/read', 'POST', {
      uri: resourceUri,
      clinic_id: 1
    });
  };

  const testPromptGet = () => {
    try {
      const args = JSON.parse(promptArgs);
      testEndpoint('prompts/get', 'POST', {
        name: promptName,
        arguments: args
      });
    } catch (error) {
      setResponse({ 
        content: [{ 
          type: 'text', 
          text: `Erro no JSON dos argumentos: ${error instanceof Error ? error.message : 'JSON inválido'}` 
        }], 
        isError: true 
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Teste do Protocolo MCP</h1>
        <Badge variant="outline">Conformidade Anthropic</Badge>
      </div>

      <Tabs defaultValue="tools" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="initialize">Initialize</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={testToolsList} disabled={loading}>
                  GET /tools/list
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Executar Tool</h4>
                <Input
                  placeholder="Nome da tool (ex: create_appointment)"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                />
                <Textarea
                  placeholder='Argumentos JSON (ex: {"clinic_id": 1, "user_id": 4})'
                  value={toolArgs}
                  onChange={(e) => setToolArgs(e.target.value)}
                  rows={4}
                />
                <Button onClick={testToolCall} disabled={loading || !toolName}>
                  POST /tools/call
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={testResourcesList} disabled={loading}>
                  GET /resources/list
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Ler Resource</h4>
                <Input
                  placeholder="URI do resource (ex: clinic://contacts)"
                  value={resourceUri}
                  onChange={(e) => setResourceUri(e.target.value)}
                />
                <Button onClick={testResourceRead} disabled={loading || !resourceUri}>
                  POST /resources/read
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP Prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={testPromptsList} disabled={loading}>
                  GET /prompts/list
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Obter Prompt</h4>
                <Input
                  placeholder="Nome do prompt (ex: appointment_creation_prompt)"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                />
                <Textarea
                  placeholder='Argumentos JSON (ex: {"user_message": "Agendar consulta"})'
                  value={promptArgs}
                  onChange={(e) => setPromptArgs(e.target.value)}
                  rows={3}
                />
                <Button onClick={testPromptGet} disabled={loading || !promptName}>
                  POST /prompts/get
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="initialize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP Initialize</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={testInitialize} disabled={loading}>
                  GET /initialize
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Endpoint de inicialização que retorna as capacidades do servidor MCP
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Response Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Resposta
            {loading && <Badge variant="secondary">Carregando...</Badge>}
            {response?.isError && <Badge variant="destructive">Erro</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
              {response ? JSON.stringify(response, null, 2) : 'Nenhuma resposta ainda'}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Exemplos Rápidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Criar Consulta</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setToolName('create_appointment');
                  setToolArgs(JSON.stringify({
                    contact_id: 1,
                    clinic_id: 1,
                    user_id: 4,
                    scheduled_date: "2025-06-20",
                    scheduled_time: "10:00",
                    duration_minutes: 60
                  }, null, 2));
                }}
              >
                Preencher Exemplo
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Listar Consultas</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setToolName('list_appointments');
                  setToolArgs(JSON.stringify({
                    clinic_id: 1
                  }, null, 2));
                }}
              >
                Preencher Exemplo
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Verificar Disponibilidade</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setToolName('check_availability');
                  setToolArgs(JSON.stringify({
                    clinic_id: 1,
                    user_id: 4,
                    date: "2025-06-20",
                    duration_minutes: 60
                  }, null, 2));
                }}
              >
                Preencher Exemplo
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Ler Contatos</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setResourceUri('clinic://contacts');
                }}
              >
                Preencher Exemplo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}