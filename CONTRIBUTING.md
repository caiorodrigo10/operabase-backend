# 🤝 Guia de Contribuição - Operabase

> **⚠️ REPOSITÓRIO PRIVADO** - Acesso restrito apenas a desenvolvedores autorizados

## 🔐 Acesso e Permissões

Este é um repositório **privado** da Operabase. Apenas desenvolvedores autorizados podem:
- Visualizar o código
- Fazer contribuições
- Acessar documentação interna

## 🛠️ Configuração do Ambiente de Desenvolvimento

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Acesso às credenciais de desenvolvimento

### Setup Inicial
```bash
# 1. Clone o repositório (requer acesso autorizado)
git clone https://github.com/organizacao/Operabase.git
cd Operabase

# 2. Instale dependências
npm install

# 3. Configure ambiente
cp .env.example .env
# Solicite as credenciais ao administrador do sistema

# 4. Execute migrações
npm run db:push

# 5. Inicie desenvolvimento
npm run dev
```

## 📋 Padrões de Desenvolvimento

### Estrutura de Branches
- `main` - Código de produção (protegida)
- `develop` - Branch de desenvolvimento
- `feature/nome-da-feature` - Novas funcionalidades
- `fix/nome-do-bug` - Correções de bugs
- `hotfix/nome-do-hotfix` - Correções urgentes

### Nomenclatura de Commits
Use o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona nova funcionalidade de agendamento
fix: corrige bug no cálculo de disponibilidade
docs: atualiza documentação da API
refactor: melhora performance do cache Redis
```

### Code Review
- **Obrigatório** para todas as alterações
- Mínimo de 1 aprovação para `develop`
- Mínimo de 2 aprovações para `main`
- Testes automatizados devem passar

## 🏗️ Arquitetura e Padrões

### Backend (Express + TypeScript)
```typescript
// Estrutura de controladores
export class ExampleController {
  async create(req: Request, res: Response) {
    // Validação com Zod
    const data = createSchema.parse(req.body);
    
    // Lógica de negócio
    const result = await this.service.create(data);
    
    // Resposta padronizada
    return res.success(result, 'Item criado com sucesso');
  }
}
```

### Frontend (React + TypeScript)
```tsx
// Componentes funcionais com hooks
function ExampleComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['example'],
    queryFn: fetchExample
  });

  if (isLoading) return <Skeleton />;
  
  return <div>{data?.name}</div>;
}
```

### Validação com Zod
```typescript
// Schema de validação
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  clinicId: z.number().positive()
});
```

## 🔒 Segurança e Multi-tenancy

### Middleware de Isolamento
```typescript
// Sempre usar isolamento por clínica
router.use(withTenantIsolation);

// Verificar permissões
router.use(requirePermission('read:appointments'));
```

### Proteção de Dados
- **NUNCA** expor dados de outras clínicas
- Sempre filtrar por `clinic_id`
- Validar permissões em cada endpoint
- Logs de auditoria para ações sensíveis

## 🧪 Testes

### Executar Testes
```bash
# Testes unitários
npm run test

# Testes de integração
npm run test:integration

# Coverage
npm run test:coverage
```

### Padrões de Teste
```typescript
describe('AppointmentController', () => {
  it('should create appointment with tenant isolation', async () => {
    // Arrange
    const appointmentData = { /* ... */ };
    
    // Act
    const result = await controller.create(appointmentData);
    
    // Assert
    expect(result.clinicId).toBe(currentUser.clinicId);
  });
});
```

## 📝 Documentação

### Documentar APIs
```typescript
/**
 * Cria um novo agendamento
 * @route POST /api/appointments
 * @param {CreateAppointmentRequest} body
 * @returns {AppointmentResponse}
 */
```

### Documentar Componentes
```tsx
/**
 * Componente de calendário para agendamentos
 * @param appointments - Lista de agendamentos
 * @param onSelect - Callback quando uma data é selecionada
 */
```

## 🚀 Deploy e Releases

### Processo de Release
1. Criar PR para `main`
2. Code review obrigatório
3. Testes automatizados
4. Deploy automático após merge

### Ambientes
- **Development** - Branch `develop`
- **Staging** - Branch `release/*`
- **Production** - Branch `main`

## 📞 Suporte e Comunicação

### Canais Internos
- **Slack**: #operabase-dev
- **Email**: dev-team@operabase.com
- **Issues**: GitHub Issues (privadas)

### Escalação
1. **Bugs críticos**: Notificar imediatamente no Slack
2. **Dúvidas técnicas**: Criar issue no GitHub
3. **Mudanças de arquitetura**: Discussão em reunião técnica

## ⚡ Scripts Úteis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento
npm run build           # Build para produção
npm run check           # Verificação de tipos

# Banco de dados
npm run db:push         # Aplicar migrações
npm run db:studio       # Interface visual do banco

# Qualidade de código
npm run lint            # Linter
npm run format          # Formatação
npm run type-check      # Verificação de tipos
```

## 🎯 Checklist para Pull Requests

- [ ] Código segue os padrões estabelecidos
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Isolamento multi-tenant respeitado
- [ ] Validações de segurança implementadas
- [ ] Performance considerada
- [ ] Logs de auditoria adicionados (se necessário)

---

**Lembre-se**: Este é um sistema crítico para clínicas médicas. Sempre priorize segurança, privacidade dos dados e estabilidade. 