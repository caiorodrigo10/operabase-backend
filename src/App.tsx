import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/components/AuthProvider";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";
import { useAuth } from "@/hooks/useAuth";
import { useGleap } from "@/hooks/useGleap";
import { LoginForm } from "@/components/LoginForm";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { AdminRouteGuard } from "./components/AdminRouteGuard";
import { Dashboard } from "./pages/dashboard";
import { Pipeline } from "./pages/pipeline";
import { Consultas } from "./pages/consultas";
import { Contatos } from "./pages/contatos";
import ConversasPage from "./pages/conversas";
import Conversas2Page from "./pages/conversas2";
import { Configuracoes } from "./pages/configuracoes";
import ConfiguracoesIndex from "./pages/configuracoes/index";
import ClinicaPage from "./pages/configuracoes/clinica";
import EquipePage from "./pages/configuracoes/equipe";
import IntegracoesPage from "./pages/configuracoes/integracoes";
import PlanosPage from "./pages/configuracoes/planos";
import PlanoDetalhesPage from "./pages/configuracoes/plano-detalhes";
import ConfiguracoesAnamnesisPage from "./pages/configuracoes/anamneses";
import LiviaConfigurationPage from "./pages/LiviaConfigurationPage";
import { ContatoDetalhes } from "./pages/contato-detalhes";
import ContatoVisaoGeral from "./pages/contato-visao-geral";
import ContatoAnamneses from "./pages/contato-anamneses";
import ContatoMaraAI from "./pages/contato-mara-ai";
import ContatoEvolucoes from "./pages/contato-evolucoes";
import ContatoDocumentos from "./pages/contato-documentos";
import ContatoArquivos from "./pages/contato-arquivos";
// import { Prontuario } from "./pages/prontuario";
import { Perfil } from "./pages/perfil";
import { RecuperarSenha } from "./pages/recuperar-senha";
import { ResetPassword } from "./pages/reset-password";
import ChatDeTeste from "./pages/chat-de-teste";
import MCPTestPage from "./pages/mcp-test";
import ApiKeysPage from "./pages/api-keys";
import { AdminDashboard } from "./pages/admin/dashboard";
import { ClinicsManagement } from "./pages/admin/clinics";
import { ConviteClinica } from "./pages/ConviteClinica";
import AnamnesisPublica from "./pages/anamnese-publica";
import PreencherAnamnese from "./pages/preencher-anamnese";
import AnamnesisTemplatesPage from "./pages/anamneses";
import EditarAnamnesePage from "./pages/editar-anamnese";
import EditarAnamneseResposta from "./pages/editar-anamnese-resposta";
import TrabalhadoresesDigitais from "./pages/TrabalhadoresesDigitais";
import MaraAIConfig from "./pages/mara-ai-config";
import BaseConhecimento from "./pages/BaseConhecimento";
import RAGDocuments from "./pages/rag/RAGDocuments";
import RAGUpload from "./pages/rag/RAGUpload";
import FunisPage from "./pages/funis";
import FunilDetalhes from "./pages/funil-detalhes";
import SystemLogs from "./pages/SystemLogs";

import Editor2 from "./pages/editor2";
import { PreviewPage } from "./pages/preview";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();
  const { user, loading } = useAuth();
  const { isAdminView } = useAdmin();

  console.log('🔍 Router state:', { user: !!user, loading, location });

  // Handle public routes first, completely outside auth system
  if (location.startsWith('/public/anamnese/') || location.startsWith('/anamnese/')) {
    return <AnamnesisPublica />;
  }

  // Handle clinic invitation route (public access)
  if (location.startsWith('/convite-clinica/')) {
    return (
      <WouterRouter>
        <Route path="/convite-clinica/:token" component={ConviteClinica} />
      </WouterRouter>
    );
  }

  // Handle preview routes (public access)
  if (location === '/preview/editor2') {
    return <PreviewPage pageId="editor2" />;
  }

  if (location === '/reset-password') {
    return <ResetPassword />;
  }

  // Handle editor routes outside layout system (fullscreen editors)
  if (user && location === '/editor2') {
    return <Editor2 />;
  }

  const getCurrentPage = () => {
    if (location === "/") return "consultas";
    if (location === "/relatorios") return "dashboard";
    return location.substring(1);
  };

  if (loading) {
    console.log('⏳ Loading state - showing skeleton');
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🔑 No user - showing login form');
    return <LoginForm />;
  }

  console.log('✅ User authenticated - showing main app');

  // Conditional layout based on admin view state
  if (isAdminView || location.startsWith('/admin')) {
    // Admin layout with admin routes
    return (
      <AdminLayout>
        <Switch>
          <Route path="/admin" component={() => (
            <AdminRouteGuard>
              <AdminDashboard />
            </AdminRouteGuard>
          )} />
          <Route path="/admin/clinics" component={() => (
            <AdminRouteGuard>
              <ClinicsManagement />
            </AdminRouteGuard>
          )} />
          <Route path="/admin/users" component={() => (
            <AdminRouteGuard>
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Gestão de Usuários</h1>
                <p className="text-gray-600">Página em desenvolvimento...</p>
              </div>
            </AdminRouteGuard>
          )} />
          <Route path="/admin/settings" component={() => (
            <AdminRouteGuard>
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Configurações do Sistema</h1>
                <p className="text-gray-600">Página em desenvolvimento...</p>
              </div>
            </AdminRouteGuard>
          )} />
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    );
  }

  // Default user layout with user routes
  return (
    <Layout currentPage={getCurrentPage()}>
      <Switch>
        <Route path="/" component={Consultas} />
        <Route path="/relatorios" component={Dashboard} />
        <Route path="/pipeline" component={Pipeline} />
        <Route path="/consultas" component={Consultas} />
        <Route path="/contatos" component={Contatos} />
        <Route path="/conversas" component={ConversasPage} />
        <Route path="/conversas2" component={Conversas2Page} />
        <Route path="/contatos/:id" component={ContatoDetalhes} />
        <Route path="/contatos/:id/visao-geral" component={ContatoVisaoGeral} />
        <Route path="/contatos/:id/anamneses" component={ContatoAnamneses} />
        <Route path="/contatos/:id/mara-ai" component={ContatoMaraAI} />
        <Route path="/contatos/:id/evolucoes" component={ContatoEvolucoes} />
        <Route path="/contatos/:id/documentos" component={ContatoDocumentos} />
        <Route path="/contatos/:id/arquivos" component={ContatoArquivos} />
        <Route path="/contatos/:contactId/preencher-anamnese" component={PreencherAnamnese} />
        <Route path="/contatos/:contactId/anamnese/:anamnesisId/editar" component={EditarAnamneseResposta} />
        <Route path="/anamneses" component={AnamnesisTemplatesPage} />
        <Route path="/anamneses/:id/editar" component={EditarAnamnesePage} />
        {/* <Route path="/prontuario/:id?" component={Prontuario} /> */}
        <Route path="/configuracoes" component={ConfiguracoesIndex} />
        <Route path="/configuracoes/clinica" component={ClinicaPage} />
        <Route path="/configuracoes/equipe" component={EquipePage} />
        <Route path="/configuracoes/integracoes" component={IntegracoesPage} />
        <Route path="/configuracoes/planos" component={PlanosPage} />
        <Route path="/configuracoes/planos/:id" component={PlanoDetalhesPage} />
        <Route path="/configuracoes/anamneses" component={ConfiguracoesAnamnesisPage} />
        <Route path="/configuracoes/anamneses/:id/editar" component={EditarAnamnesePage} />
        <Route path="/livia-configuration" component={LiviaConfigurationPage} />
        <Route path="/perfil" component={Perfil} />
        <Route path="/chatdeteste" component={ChatDeTeste} />
        <Route path="/mcptest" component={MCPTestPage} />
        <Route path="/api-keys" component={ApiKeysPage} />
        <Route path="/trabalhadores-digitais" component={TrabalhadoresesDigitais} />
        <Route path="/trabalhadores-digitais/mara-ai" component={MaraAIConfig} />
        <Route path="/base-conhecimento" component={BaseConhecimento} />
        <Route path="/base-conhecimento/:id" component={BaseConhecimento} />
        <Route path="/base-conhecimento/profissionais" component={BaseConhecimento} />
        <Route path="/base-conhecimento/empresa" component={BaseConhecimento} />
        <Route path="/rag" component={RAGDocuments} />
        <Route path="/rag/upload" component={RAGUpload} />
        <Route path="/funis" component={FunisPage} />
        <Route path="/funis/:id" component={FunilDetalhes} />
        <Route path="/system-logs" component={SystemLogs} />

        <Route path="/editor2" component={Editor2} />
        <Route path="/preview/editor2" component={() => <PreviewPage pageId="editor2" />} />

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function GleapWrapper() {
  const [location] = useLocation();

  // Don't initialize Gleap for public anamnesis pages or editors
  const isPublicPage = location.startsWith('/public/anamnese/') || location.startsWith('/anamnese/');
  const isEditor2 = location === '/editor2';
  const shouldInitializeGleap = !isPublicPage && !isEditor2;

  // Always call useGleap hook, but pass condition to control initialization
  useGleap(shouldInitializeGleap);

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminProvider>
          <TooltipProvider>
            <Toaster />
            <GleapWrapper />
          </TooltipProvider>
        </AdminProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;