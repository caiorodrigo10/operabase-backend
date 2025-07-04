## 📋 Descrição das Mudanças
<!-- Descreva claramente o que foi alterado -->

## 🎯 Tipo de Mudança
- [ ] 🐛 Bug fix (mudança que corrige um problema)
- [ ] ✨ Nova funcionalidade (mudança que adiciona funcionalidade)
- [ ] 💥 Breaking change (mudança que quebra compatibilidade)
- [ ] 📚 Documentação (mudanças apenas na documentação)
- [ ] 🎨 Refatoração (mudança que não corrige bug nem adiciona funcionalidade)
- [ ] ⚡ Performance (mudança que melhora performance)
- [ ] 🧪 Testes (adição ou correção de testes)

## 🔗 Issues Relacionadas
<!-- Liste issues que este PR resolve -->
Closes #(issue_number)
Fixes #(issue_number)
Relates to #(issue_number)

## 🧪 Como Testar
<!-- Instruções detalhadas para testar as mudanças -->
1. Faça checkout desta branch
2. Execute `npm install`
3. Configure ambiente com `.env`
4. Execute `npm run dev`
5. Teste os seguintes cenários:
   - [ ] Cenário 1
   - [ ] Cenário 2
   - [ ] Cenário 3

## 📸 Screenshots/Videos
<!-- Se aplicável, adicione screenshots ou videos das mudanças -->

## ✅ Checklist
### 🔒 Segurança e Multi-tenancy
- [ ] Isolamento multi-tenant respeitado
- [ ] Validações de permissão implementadas
- [ ] Dados sensíveis protegidos
- [ ] Logs de auditoria adicionados (se necessário)

### 💻 Código
- [ ] Código segue os padrões do projeto
- [ ] Validações com Zod implementadas
- [ ] Tratamento de erros adequado
- [ ] Performance considerada
- [ ] Compatibilidade com ambientes (dev/prod)

### 🧪 Testes
- [ ] Testes unitários adicionados/atualizados
- [ ] Testes de integração adicionados (se necessário)
- [ ] Testes manuais realizados
- [ ] Edge cases considerados

### 📚 Documentação
- [ ] Documentação atualizada (se necessário)
- [ ] Comentários no código (onde necessário)
- [ ] README atualizado (se necessário)
- [ ] CHANGELOG atualizado

### 🔧 Build e Deploy
- [ ] Build local executado com sucesso
- [ ] Migrações de banco funcionando
- [ ] Variáveis de ambiente documentadas
- [ ] Deploy testado em staging (se aplicável)

## 🏥 Impacto Clínico
- **Usuários Afetados**: [ex: Médicos, Recepcionistas, Admins]
- **Módulos Impactados**: [ex: Agendamentos, Prontuários, IA]
- **Downtime Necessário**: [ex: Sim/Não, quanto tempo]

## 📊 Performance
- [ ] Sem impacto na performance
- [ ] Melhora a performance
- [ ] Pode impactar performance (justificar abaixo)

<!-- Se pode impactar performance, explique: -->

## 🔄 Rollback Plan
<!-- Como reverter estas mudanças se necessário -->
- [ ] Rollback simples (git revert)
- [ ] Requer rollback de migração
- [ ] Requer rollback de configuração

## 🤔 Observações para Reviewers
<!-- Pontos específicos que os reviewers devem prestar atenção -->

## 📋 Próximos Passos
<!-- O que precisa ser feito após o merge -->
- [ ] Deploy em produção
- [ ] Atualizar documentação externa
- [ ] Comunicar mudanças para equipe
- [ ] Monitorar métricas pós-deploy

---
**⚠️ LEMBRETE**: Certifique-se de que todas as verificações foram feitas antes de solicitar review. 