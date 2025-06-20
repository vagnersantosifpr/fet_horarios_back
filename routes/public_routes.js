// routes/public.js
const express = require('express');
const router = express.Router();
const PublicContent = require('../models/PublicContent');

// GET /api/public/content - Obter conteúdo da página pública
router.get('/content', async (req, res) => {
  try {
    // Buscar o conteúdo ativo mais recente
    let content = await PublicContent.findOne({ isActive: true })
      .sort({ lastUpdated: -1 });

    // Se não houver conteúdo, criar um padrão
    if (!content) {
      content = await createDefaultContent();
    }

    // Retornar apenas os campos necessários
    const response = {
      success: true,
      data: {
        title: content.title,
        welcomeMessage: content.welcomeMessage,
        features: content.features,
        updates: content.updates.sort((a, b) => new Date(b.date) - new Date(a.date)), // Mais recentes primeiro
        faq: content.faq,
        lastUpdated: content.lastUpdated
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao buscar conteúdo público:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Função para criar conteúdo padrão
async function createDefaultContent() {
  const defaultContent = new PublicContent({
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

  return await defaultContent.save();
}

module.exports = router;

