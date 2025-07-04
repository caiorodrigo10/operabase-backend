import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Heart, UserCheck, Baby, Edit3 } from "lucide-react";

interface Funil {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "Ativo" | "Rascunho";
  statusColor: "green" | "yellow";
  pages: number;
  conversions: number;
}

const mockFunis: Funil[] = [
  {
    id: "1",
    title: "Funil Cardiologia",
    description: "Captação de leads para consultas cardiológicas",
    icon: <Heart className="h-6 w-6 text-blue-600" />,
    status: "Ativo",
    statusColor: "green",
    pages: 3,
    conversions: 142
  },
  {
    id: "2", 
    title: "Funil Dermatologia",
    description: "Landing pages para tratamentos dermatológicos",
    icon: <UserCheck className="h-6 w-6 text-purple-600" />,
    status: "Ativo",
    statusColor: "green",
    pages: 2,
    conversions: 89
  },
  {
    id: "3",
    title: "Funil Pediatria", 
    description: "Consultas pediátricas especializadas",
    icon: <Baby className="h-6 w-6 text-green-600" />,
    status: "Rascunho",
    statusColor: "yellow",
    pages: 1,
    conversions: 0
  }
];

export default function FunisPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Funis de Marketing</h1>
          <p className="text-gray-600">Gerencie seus funis e páginas de captação</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Novo Funil
        </Button>
      </div>

      {/* Funis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Create New Funil Card - Always First */}
        <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer">
          <CardContent className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Criar Novo Funil</h3>
            <p className="text-sm text-gray-500 text-center">
              Comece um novo funil de marketing
            </p>
          </CardContent>
        </Card>

        {/* Existing Funis */}
        {mockFunis.map((funil) => (
          <Card key={funil.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                  {funil.icon}
                </div>
                <Badge 
                  variant={funil.statusColor === "green" ? "default" : "secondary"}
                  className={
                    funil.statusColor === "green" 
                      ? "bg-green-100 text-green-800 hover:bg-green-100" 
                      : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                  }
                >
                  {funil.status}
                </Badge>
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {funil.title}
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                {funil.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>{funil.pages} páginas</span>
                <span>{funil.conversions} conversões</span>
              </div>
              <Button 
                variant="outline" 
                className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                asChild
              >
                <Link href={`/funis/${funil.id}`}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editar Funil
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}