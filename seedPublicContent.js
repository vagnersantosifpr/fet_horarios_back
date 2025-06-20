// scripts/seedPublicContent.js
const mongoose = require('mongoose');
const PublicContent = require('../models/PublicContent');
require('dotenv').config();

async function seedPublicContent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Verificar se já existe conteúdo
    const existingContent = await PublicContent.findOne();
    if (existingContent) {
      console.log('Conteúdo público já existe. Atualizando...');
      await PublicContent.deleteMany({});
    }

    // Criar novo conteúdo
    const content = new PublicContent({
      title: 'Bem-vindo ao FET Horários',
      welcomeMessage: 'Seja bem-vindo ao Sistema de Geração de Horários do IFPR - Campus Assis Chateaubriand. Nossa plataforma foi desenvolvida para simplificar a gestão de horários acadêmicos, oferecendo uma solução eficiente e intuitiva para administradores, professores e alunos.',
      features: [
        {
          title: 'Gestão Completa de Disciplinas',
          description: 'Cadastre e gerencie disciplinas com informações detalhadas como código, nome, departamento, carga horária e créditos.',
          icon: '📚'
        },
        {
          title: 'Administração de Salas',
          description: 'Controle total sobre as salas de aula, incluindo capacidade, tipo e disponibilidade para otimizar a alocação.',
          icon: '🏢'
        },
        {
          title: 'Gestão de Usuários',
          description: 'Sistema robusto de usuários com diferentes níveis de acesso: administradores, professores e alunos.',
          icon: '👥'
        },
        {
          title: 'Geração Inteligente de Horários',
          description: 'Algoritmos avançados para criar grades horárias otimizadas, considerando restrições e preferências.',
          icon: '✨'
        },
        {
          title: 'Interface Responsiva',
          description: 'Design moderno e responsivo que funciona perfeitamente em desktop, tablet e dispositivos móveis.',
          icon: '📱'
        },
        {
          title: 'Autenticação Segura',
          description: 'Sistema de autenticação baseado em JWT para garantir a segurança e privacidade dos dados.',
          icon: '🔒'
        }
      ],
      updates: [
        {
          version: '1.0.0',
          date: new Date('2025-06-20'),
          description: 'Lançamento inicial do sistema com funcionalidades básicas de gestão de disciplinas, salas e usuários.',
          type: 'feature'
        },
        {
          version: '1.0.1',
          date: new Date('2025-06-21'),
          description: 'Correção de bugs na autenticação JWT e melhoria na validação de tokens.',
          type: 'bugfix'
        },
        {
          version: '1.0.2',
          date: new Date('2025-06-22'),
          description: 'Implementação de paginação na listagem de disciplinas e melhoria na performance das consultas.',
          type: 'improvement'
        }
      ],
      faq: [
        {
          question: 'Como faço para cadastrar uma nova disciplina?',
          answer: 'Para cadastrar uma nova disciplina, faça login como administrador, acesse a seção "Administração > Disciplinas" e clique no botão "Nova Disciplina". Preencha todos os campos obrigatórios e clique em "Criar".',
          category: 'disciplinas'
        },
        {
          question: 'Posso visualizar meu horário como professor?',
          answer: 'Sim! Após fazer login com sua conta de professor, você pode acessar a seção "Meus Horários" para visualizar sua grade horária personalizada com todas as suas aulas.',
          category: 'horarios'
        },
        {
          question: 'Como alterar minha senha?',
          answer: 'Atualmente, a alteração de senha deve ser solicitada ao administrador do sistema. Em breve, implementaremos a funcionalidade de alteração de senha pelo próprio usuário.',
          category: 'conta'
        },
        {
          question: 'O sistema funciona em dispositivos móveis?',
          answer: 'Sim! O FET Horários possui design responsivo e funciona perfeitamente em smartphones, tablets e computadores.',
          category: 'geral'
        },
        {
          question: 'Como são gerados os horários?',
          answer: 'O sistema utiliza algoritmos inteligentes que consideram a disponibilidade de salas, professores, e restrições de horário para gerar grades otimizadas automaticamente.',
          category: 'horarios'
        }
      ]
    });

    await content.save();
    console.log('Conteúdo público criado com sucesso!');
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Erro ao criar conteúdo público:', error);
    mongoose.disconnect();
  }
}

seedPublicContent();

