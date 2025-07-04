import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

export function ContatoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (id) {
      setLocation(`/contatos/${id}/visao-geral`);
    }
  }, [id, setLocation]);

  // Return a simple loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f766e] mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}