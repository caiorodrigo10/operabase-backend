
# PLANO DE REFATORAÇÃO - ETAPA 1
## Estruturação de Domínios e Separação de Camadas

### 📁 ESTRUTURA ALVO

```
server/
├── domains/                 # 🎯 NOVO - Domínios de negócio
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.middleware.ts
│   │   ├── auth.routes.ts
│   │   └── auth.types.ts
│   ├── appointments/
│   │   ├── appointments.controller.ts
│   │   ├── appointments.service.ts
│   │   ├── appointments.repository.ts
│   │   ├── appointments.routes.ts
│   │   └── appointments.types.ts
│   ├── contacts/
│   │   ├── contacts.controller.ts
│   │   ├── contacts.service.ts
│   │   ├── contacts.repository.ts
│   │   ├── contacts.routes.ts
│   │   └── contacts.types.ts
│   ├── clinics/
│   │   ├── clinics.controller.ts
│   │   ├── clinics.service.ts
│   │   ├── clinics.repository.ts
│   │   ├── clinics.routes.ts
│   │   └── clinics.types.ts
│   ├── calendar/
│   │   ├── calendar.controller.ts
│   │   ├── calendar.service.ts
│   │   ├── calendar.routes.ts
│   │   └── calendar.types.ts
│   ├── medical-records/
│   │   ├── medical-records.controller.ts
│   │   ├── medical-records.service.ts
│   │   ├── medical-records.repository.ts
│   │   ├── medical-records.routes.ts
│   │   └── medical-records.types.ts
│   ├── pipeline/
│   │   ├── pipeline.controller.ts
│   │   ├── pipeline.service.ts
│   │   ├── pipeline.repository.ts
│   │   ├── pipeline.routes.ts
│   │   └── pipeline.types.ts
│   └── analytics/
│       ├── analytics.controller.ts
│       ├── analytics.service.ts
│       ├── analytics.repository.ts
│       ├── analytics.routes.ts
│       └── analytics.types.ts
├── shared/                  # 🎯 REORGANIZAR
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── clinic-access.middleware.ts
│   │   ├── permissions.middleware.ts
│   │   └── index.ts
│   ├── validators/
│   │   ├── common.validators.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── common.types.ts
│   │   ├── database.types.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── app.errors.ts
│   │   ├── validation.errors.ts
│   │   └── index.ts
│   └── utils/
│       ├── response.utils.ts
│       ├── date.utils.ts
│       └── index.ts
├── infrastructure/          # 🎯 NOVO - Infraestrutura
│   ├── database/
│   │   ├── connection.ts
│   │   ├── migrations.ts
│   │   └── schemas/
│   │       ├── auth.schema.ts
│   │       ├── appointments.schema.ts
│   │       ├── contacts.schema.ts
│   │       ├── clinics.schema.ts
│   │       ├── medical-records.schema.ts
│   │       ├── pipeline.schema.ts
│   │       └── index.ts
│   ├── storage/
│   │   ├── postgres-storage.ts
│   │   └── storage-factory.ts
│   └── external-apis/
│       ├── google-calendar.service.ts
│       ├── mara-ai.service.ts
│       └── index.ts
└── api/                    # 🎯 NOVO - Agregação de rotas
    └── v1/
        ├── index.ts
        └── router.ts
```

### 🎯 MAPEAMENTO DE ROTAS ATUAIS → NOVA ESTRUTURA

#### **1. DOMÍNIO AUTH** (28 rotas identificadas)
```
ATUAL → NOVO DOMÍNIO
/api/user/clinics                    → domains/auth/auth.routes.ts
/api/clinics/:clinicId/invitations   → domains/auth/auth.routes.ts
/api/invitations/:token/accept       → domains/auth/auth.routes.ts
/api/user/profile                    → domains/auth/auth.routes.ts
/api/auth/request-password-reset     → domains/auth/auth.routes.ts
/api/auth/reset-password             → domains/auth/auth.routes.ts
```

#### **2. DOMÍNIO CLINICS** (8 rotas identificadas)
```
/api/clinics/:id                     → domains/clinics/clinics.routes.ts
/api/clinics (POST)                  → domains/clinics/clinics.routes.ts
/api/clinics/:id (PUT)               → domains/clinics/clinics.routes.ts
/api/clinic/:id/users                → domains/clinics/clinics.routes.ts
/api/clinic/:clinicId/users (POST)   → domains/clinics/clinics.routes.ts
/api/clinic/:clinicId/users/:userId (DELETE) → domains/clinics/clinics.routes.ts
/api/clinic/:id/config               → domains/clinics/clinics.routes.ts
```

#### **3. DOMÍNIO CONTACTS** (6 rotas identificadas)
```
/api/contacts                        → domains/contacts/contacts.routes.ts
/api/contacts/:id                    → domains/contacts/contacts.routes.ts
/api/contacts (POST)                 → domains/contacts/contacts.routes.ts
/api/contacts/:id (PUT)              → domains/contacts/contacts.routes.ts
/api/contacts/:id/status (PATCH)     → domains/contacts/contacts.routes.ts
```

#### **4. DOMÍNIO APPOINTMENTS** (12 rotas identificadas)
```
/api/appointments                    → domains/appointments/appointments.routes.ts
/api/appointments/:id                → domains/appointments/appointments.routes.ts
/api/contacts/:contactId/appointments → domains/appointments/appointments.routes.ts
/api/appointments (POST)             → domains/appointments/appointments.routes.ts
/api/appointments/:id (PUT)          → domains/appointments/appointments.routes.ts
/api/appointments/:id (PATCH)        → domains/appointments/appointments.routes.ts
/api/appointments/:id (DELETE)       → domains/appointments/appointments.routes.ts
/api/availability/check              → domains/appointments/appointments.routes.ts
/api/availability/find-slots         → domains/appointments/appointments.routes.ts
```

#### **5. DOMÍNIO CALENDAR** (8 rotas identificadas)
```
/api/calendar/auth/google            → domains/calendar/calendar.routes.ts
/api/calendar/callback/google        → domains/calendar/calendar.routes.ts
/api/calendar/integrations           → domains/calendar/calendar.routes.ts
/api/calendar/sync-from-google       → domains/calendar/calendar.routes.ts
/api/calendar/force-refresh          → domains/calendar/calendar.routes.ts
/api/calendar/check-availability     → domains/calendar/calendar.routes.ts
```

#### **6. DOMÍNIO MEDICAL-RECORDS** (6 rotas identificadas)
```
/api/contacts/:contactId/medical-records     → domains/medical-records/medical-records.routes.ts
/api/appointments/:appointmentId/medical-record → domains/medical-records/medical-records.routes.ts
/api/medical-records                         → domains/medical-records/medical-records.routes.ts
/api/medical-records/:id                     → domains/medical-records/medical-records.routes.ts
/api/medical-records/:id (PUT)               → domains/medical-records/medical-records.routes.ts
```

#### **7. DOMÍNIO PIPELINE** (15 rotas identificadas)
```
/api/clinics/:clinicId/pipeline-stages       → domains/pipeline/pipeline.routes.ts
/api/pipeline-stages/:id                     → domains/pipeline/pipeline.routes.ts
/api/pipeline-opportunities                  → domains/pipeline/pipeline.routes.ts
/api/pipeline-opportunities/:id              → domains/pipeline/pipeline.routes.ts
/api/pipeline-opportunities/:id/move         → domains/pipeline/pipeline.routes.ts
/api/pipeline-opportunities/:id/history      → domains/pipeline/pipeline.routes.ts
/api/pipeline-opportunities/:id/activities   → domains/pipeline/pipeline.routes.ts
/api/pipeline-activities                     → domains/pipeline/pipeline.routes.ts
/api/pipeline-activities/:id                 → domains/pipeline/pipeline.routes.ts
/api/pipeline-activities/:id/complete        → domains/pipeline/pipeline.routes.ts
```

#### **8. DOMÍNIO ANALYTICS** (3 rotas identificadas)
```
/api/analytics                               → domains/analytics/analytics.routes.ts
/api/analytics (POST)                        → domains/analytics/analytics.routes.ts
```

### 📐 PADRÕES ARQUITETURAIS A IMPLEMENTAR

#### **Controller Pattern:**
```typescript
export class AppointmentsController {
  constructor(private service: AppointmentsService) {}
  
  async create(req: Request, res: Response) {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      const appointment = await this.service.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      // Error handling
    }
  }
}
```

#### **Service Pattern:**
```typescript
export class AppointmentsService {
  constructor(private repository: AppointmentsRepository) {}
  
  async createAppointment(data: CreateAppointmentDto) {
    // Lógica de negócio
    // Validações específicas
    // Orquestração de calls
    return this.repository.create(data);
  }
}
```

#### **Repository Pattern:**
```typescript
export class AppointmentsRepository {
  constructor(private storage: Storage) {}
  
  async create(data: InsertAppointment) {
    return this.storage.createAppointment(data);
  }
}
```

### 🚀 ESTRATÉGIA DE MIGRAÇÃO SEGURA

#### **FASE 1: Criação da Nova Estrutura (SEM QUEBRAR NADA)**
1. Criar estrutura de pastas `domains/`
2. Implementar primeiro domínio (AUTH) como POC
3. Manter `routes.ts` original funcionando
4. Testes paralelos

#### **FASE 2: Migração Gradual por Domínio**
1. **Semana 1**: Domínio AUTH
2. **Semana 2**: Domínio APPOINTMENTS  
3. **Semana 3**: Domínio CONTACTS
4. **Semana 4**: Domínio CLINICS
5. **Semana 5**: Domínio CALENDAR
6. **Semana 6**: Domínio MEDICAL-RECORDS
7. **Semana 7**: Domínio PIPELINE
8. **Semana 8**: Domínio ANALYTICS

#### **FASE 3: Limpeza e Otimização**
1. Remoção do `routes.ts` monolítico
2. Reestruturação do `shared/schema.ts`
3. Implementação de testes automatizados
4. Documentação atualizada

### 🔒 ESTRATÉGIA DE ROLLBACK

1. **Git Branching**: Cada domínio em branch separada
2. **Feature Flags**: Ativar/desativar nova estrutura por variável de ambiente
3. **Backup do Estado Atual**: Manter `routes.ts` original como fallback
4. **Testes de Regressão**: Validar que nada quebrou

### 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. **Criar estrutura de pastas**
2. **Implementar domínio AUTH como POC**
3. **Separar schemas por domínio**
4. **Configurar roteamento modular**
5. **Implementar middleware compartilhado**

### 📊 MÉTRICAS DE SUCESSO

- ✅ Redução de 1.800 linhas para módulos de <200 linhas cada
- ✅ Separação clara de responsabilidades
- ✅ Zero breaking changes na API
- ✅ Melhoria na velocidade de desenvolvimento
- ✅ Facilidade para adicionar novos domínios

### ⚠️ RISCOS IDENTIFICADOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Dependências circulares | Alto | Alto | Dependency Injection + Interfaces |
| Breaking changes na API | Médio | Alto | Manter compatibilidade total |
| Conflitos de merge | Médio | Médio | Branches por domínio + Reviews |
| Performance degradation | Baixo | Médio | Benchmarks antes/depois |

### 🔧 FERRAMENTAS NECESSÁRIAS

1. **Linting**: ESLint com regras para arquitetura
2. **Testing**: Jest para testes unitários
3. **Documentation**: JSDoc para documentação de APIs
4. **Monitoring**: Logs estruturados por domínio
