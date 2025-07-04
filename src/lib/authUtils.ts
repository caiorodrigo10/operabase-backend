export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function handleAuthError(error: any, toast: any) {
  if (isUnauthorizedError(error)) {
    toast({
      title: "Acesso Negado",
      description: "Você foi desconectado. Redirecionando para login...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return true;
  }
  return false;
}