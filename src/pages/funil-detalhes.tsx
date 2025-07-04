import React, { useCallback, useMemo, useState } from 'react';
import { useParams, Link } from 'wouter';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Position,
  Handle,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Eye, 
  Edit3, 
  Settings, 
  Plus, 
  MoreVertical,
  CheckCircle,
  AlertCircle,
  FileText,
  BarChart3
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Custom Node Component
const FunilPageNode = ({ data }: { data: any }) => {
  const getStatusIcon = () => {
    switch (data.status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'draft':
        return <FileText className="h-4 w-4 text-orange-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getBorderColor = () => {
    switch (data.status) {
      case 'published':
        return 'border-green-300';
      case 'draft':
        return 'border-orange-300';
      case 'error':
        return 'border-red-300';
      default:
        return 'border-gray-300';
    }
  };

  const getStatusText = () => {
    switch (data.status) {
      case 'published':
        return 'Publicada';
      case 'draft':
        return 'Rascunho';
      case 'error':
        return 'Erro';
      default:
        return 'Rascunho';
    }
  };

  return (
    <div className="relative">
      {/* Target Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#3b82f6',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />
      
      <Card className={`w-36 ${getBorderColor()} border-2 hover:shadow-lg transition-all duration-200 bg-white`}>
        <CardHeader className="pb-1 px-3 pt-3">
          {/* Preview Thumbnail - Taller */}
          <div className="w-full h-28 bg-gray-100 rounded-md mb-2 flex items-center justify-center border">
            <div className="text-center text-gray-500">
              <FileText className="h-6 w-6 mx-auto mb-1" />
              <span className="text-xs">Preview</span>
            </div>
          </div>
          
          {/* Page Title and Status */}
          <div className="flex items-center justify-between mb-1">
            <CardTitle className="text-xs font-medium text-gray-900 truncate">
              {data.title}
            </CardTitle>
            {getStatusIcon()}
          </div>
          
          <Badge 
            variant="secondary" 
            className={`text-xs w-fit ${
              data.status === 'published' ? 'bg-green-100 text-green-800' :
              data.status === 'draft' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}
          >
            {getStatusText()}
          </Badge>
        </CardHeader>
        
        <CardContent className="pt-0 px-3 pb-3">
          {/* Quick Actions - More Compact */}
          <div className="flex items-center justify-center space-x-0.5">
            <Link href={data.type === 'landing' ? '/editor-landing' : data.type === 'thank-you' ? '/editor2' : '/editor-landing'}>
              <Button 
                size="sm" 
                variant="ghost" 
                className="p-1 h-6 w-6"
                onClick={() => {
                  if (data.type === 'landing') {
                    console.log('🔧 Abrindo Editor 1 (Landing Page)');
                  } else if (data.type === 'thank-you') {
                    console.log('🔧 Abrindo Editor 2 (Página de Obrigado)');
                  } else {
                    console.log('🔧 Abrindo Editor 1 (página padrão)');
                  }
                }}
              >
                <Edit3 className="h-3 w-3 text-blue-600" />
              </Button>
            </Link>
            <Button size="sm" variant="ghost" className="p-1 h-6 w-6">
              <Eye className="h-3 w-3 text-gray-600" />
            </Button>
            <Button size="sm" variant="ghost" className="p-1 h-6 w-6">
              <Settings className="h-3 w-3 text-gray-600" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="p-1 h-6 w-6">
                  <MoreVertical className="h-3 w-3 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Duplicar</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
      
      {/* Source Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#10b981',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />
    </div>
  );
};

// Node types - memoized to prevent warnings
const nodeTypes = {
  funilPage: FunilPageNode,
};

// Mock data for funnel
const mockFunilData = {
  id: "1",
  title: "Funil Cardiologia",
  description: "Captação de leads para consultas cardiológicas",
  pages: [
    {
      id: "page-1",
      title: "Landing Page",
      status: "published",
      type: "landing"
    },
    {
      id: "page-2", 
      title: "Sobre Nossos Serviços",
      status: "published",
      type: "content"
    },
    {
      id: "page-3",
      title: "Agendar Consulta",
      status: "draft",
      type: "form"
    },
    {
      id: "page-4",
      title: "Página de Obrigado",
      status: "published",
      type: "thank-you"
    }
  ]
};

export default function FunilDetalhes() {
  const { id } = useParams();

  // Create nodes from mock data with proper spacing
  const initialNodes: Node[] = useMemo(() => {
    return mockFunilData.pages.map((page, index) => ({
      id: page.id,
      type: 'funilPage',
      position: { x: index * 220, y: 150 },
      data: {
        id: page.id,
        title: page.title,
        status: page.status,
        type: page.type
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
    }));
  }, []);

  // Create edges to connect nodes in sequence
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 0; i < mockFunilData.pages.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: mockFunilData.pages[i].id,
        target: mockFunilData.pages[i + 1].id,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: '#10b981', 
          strokeWidth: 3,
        },
      });
    }
    return edges;
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/funis">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{mockFunilData.title}</h1>
            <p className="text-sm text-gray-500">{mockFunilData.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Página
          </Button>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.15,
            maxZoom: 1.2,
            minZoom: 0.8
          }}
          attributionPosition="top-right"
          className="bg-gray-50"
        >
          <Controls position="top-left" />
          <MiniMap 
            position="top-right"
            className="bg-white border border-gray-200 rounded-lg"
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background gap={20} size={1} color="#e5e7eb" />
        </ReactFlow>
      </div>

      {/* Bottom Stats Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-6">
            <span>{mockFunilData.pages.length} páginas</span>
            <span>142 conversões este mês</span>
            <span>Taxa de conversão: 12.5%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Zoom:</span>
            <Button size="sm" variant="ghost" className="px-2 h-7">−</Button>
            <Button size="sm" variant="ghost" className="px-2 h-7">100%</Button>
            <Button size="sm" variant="ghost" className="px-2 h-7">+</Button>
          </div>
        </div>
      </div>
    </div>
  );
}