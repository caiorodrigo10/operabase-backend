#!/bin/bash

# Script para conectar o projeto ao GitHub
# Execute: bash connect-github.sh

echo "🚀 Conectando projeto ao GitHub..."

# Configurar Git
git config user.name "Caio Rodrigo"
git config user.email "cr@caiorodrigo.com.br"

# Adicionar remote origin
git remote add origin https://$GITHUB_USERNAME:$GITHUB_TOKEN@github.com/caiorodrigo10/sistema-gestao-clinicas.git

# Adicionar todos os arquivos
git add .

# Fazer commit inicial
git commit -m "feat: Sistema completo de gestão de clínicas

- Interface completa de agendamento com slots de 15 minutos
- Integração com Google Calendar
- Sistema de autenticação com Supabase
- IA para análise de pacientes (Mara)
- Pipeline de vendas e CRM
- Gestão completa de pacientes e consultas
- Dashboard com métricas e relatórios
- Sistema responsivo com tema claro/escuro"

# Push para GitHub
git push -u origin main

echo "✅ Projeto conectado ao GitHub com sucesso!"
echo "🔗 Acesse: https://github.com/caiorodrigo10/sistema-gestao-clinicas"