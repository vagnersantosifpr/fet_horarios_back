// Novas rotas para funcionalidades de horários solicitadas

// 2. Rota para obter meus horários (já existe como /my-horarios)
// Vamos adicionar uma versão mais específica

// Obter meus horários - versão simplificada
router.get('/meus-horarios', auth, async (req, res) => {
  try {
    const { semestre } = req.query;
    
    const query = { 
      professor: req.user._id,
      status: 'concluido' // Apenas horários concluídos
    };
    
    if (semestre) {
      query.semestre = semestre;
    }

    const horarios = await HorarioGerado.find(query)
      .populate('horarios.disciplina', 'codigo nome cargaHoraria')
      .populate('horarios.sala', 'codigo nome')
      .sort({ criadoEm: -1 })
      .limit(10); // Últimos 10 horários

    // Formatar os dados para exibição em grade de horários
    const horariosFormatados = horarios.map(horario => ({
      id: horario._id,
      titulo: horario.titulo,
      semestre: horario.semestre,
      fitnessScore: horario.fitnessScore,
      criadoEm: horario.criadoEm,
      grade: formatarGradeHorarios(horario.horarios)
    }));

    res.json({
      success: true,
      data: {
        horarios: horariosFormatados
      }
    });
  } catch (error) {
    console.error('Erro ao obter meus horários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// 3. Rota para gerar horário individual (já existe como /gerar)
// Vamos adicionar uma versão mais específica

// Gerar horário individual
router.post('/gerar-individual', auth, [
  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('Título é obrigatório'),
  body('semestre')
    .matches(/^\d{4}\.[1-2]$/)
    .withMessage('Formato de semestre inválido (YYYY.1 ou YYYY.2)'),
  body('usarPreferencias')
    .optional()
    .isBoolean()
    .withMessage('usarPreferencias deve ser um boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { titulo, semestre, usarPreferencias = true, observacoes } = req.body;

    // Verificar se o professor tem preferências configuradas
    if (usarPreferencias) {
      const preferencias = await ProfessorPreferencia.findOne({ professor: req.user._id });
      
      if (!preferencias || !preferencias.disciplinas || preferencias.disciplinas.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'É necessário configurar suas preferências e disciplinas antes de gerar um horário'
        });
      }
    }

    // Criar registro do horário com status 'gerando'
    const horario = new HorarioGerado({
      titulo,
      professor: req.user._id,
      semestre,
      parametrosAlgoritmo: {
        populacao: 50,
        geracoes: 100,
        taxaMutacao: 0.1,
        tipoCruzamento: 1
      },
      observacoes,
      status: 'gerando'
    });

    await horario.save();

    // Simular processo de geração assíncrona
    setTimeout(async () => {
      try {
        const preferencias = await ProfessorPreferencia.findOne({ professor: req.user._id });
        const horariosGerados = await simularGeracaoHorarioIndividual(preferencias);
        
        horario.horarios = horariosGerados;
        horario.status = 'concluido';
        horario.fitnessScore = Math.floor(Math.random() * 30) + 70; // Score entre 70-100
        horario.tempoExecucao = Math.floor(Math.random() * 60) + 15; // 15-75 segundos
        
        await horario.save();
      } catch (error) {
        console.error('Erro na geração individual do horário:', error);
        horario.status = 'erro';
        await horario.save();
      }
    }, 1500);

    res.status(201).json({
      success: true,
      message: 'Geração de horário individual iniciada com sucesso',
      data: {
        horario: {
          _id: horario._id,
          titulo: horario.titulo,
          status: horario.status,
          criadoEm: horario.criadoEm
        }
      }
    });
  } catch (error) {
    console.error('Erro ao iniciar geração de horário individual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// 4. Rota para gerar horário coletivo (funcionalidade de administração)
router.post('/gerar-coletivo', auth, [
  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('Título é obrigatório'),
  body('semestre')
    .matches(/^\d{4}\.[1-2]$/)
    .withMessage('Formato de semestre inválido (YYYY.1 ou YYYY.2)'),
  body('professores')
    .isArray({ min: 1 })
    .withMessage('Lista de professores é obrigatória'),
  body('professores.*')
    .isMongoId()
    .withMessage('ID de professor inválido'),
  body('parametros.otimizacao')
    .optional()
    .isIn(['equilibrio', 'preferencias', 'recursos'])
    .withMessage('Tipo de otimização inválido')
], handleValidationErrors, async (req, res) => {
  try {
    // Verificar se o usuário tem permissão de administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem gerar horários coletivos.'
      });
    }

    const { titulo, semestre, professores, parametros = {}, observacoes } = req.body;

    // Verificar se todos os professores têm preferências configuradas
    const preferenciasCount = await ProfessorPreferencia.countDocuments({
      professor: { $in: professores },
      disciplinas: { $exists: true, $not: { $size: 0 } }
    });

    if (preferenciasCount < professores.length) {
      return res.status(400).json({
        success: false,
        message: 'Nem todos os professores selecionados têm preferências configuradas'
      });
    }

    // Criar registros de horário para cada professor
    const horariosGerados = [];
    
    for (const professorId of professores) {
      const horario = new HorarioGerado({
        titulo: `${titulo} - Professor ${professorId.slice(-4)}`,
        professor: professorId,
        semestre,
        parametrosAlgoritmo: {
          populacao: parametros.populacao || 100,
          geracoes: parametros.geracoes || 200,
          taxaMutacao: parametros.taxaMutacao || 0.05,
          tipoCruzamento: parametros.tipoCruzamento || 2
        },
        observacoes: `${observacoes || ''} - Geração coletiva`,
        status: 'gerando'
      });

      await horario.save();
      horariosGerados.push(horario);
    }

    // Simular processo de geração coletiva assíncrona
    setTimeout(async () => {
      try {
        for (const horario of horariosGerados) {
          const preferencias = await ProfessorPreferencia.findOne({ professor: horario.professor });
          const horariosIndividuais = await simularGeracaoHorarioColetivo(preferencias, parametros);
          
          horario.horarios = horariosIndividuais;
          horario.status = 'concluido';
          horario.fitnessScore = Math.floor(Math.random() * 25) + 75; // Score entre 75-100
          horario.tempoExecucao = Math.floor(Math.random() * 180) + 60; // 60-240 segundos
          
          await horario.save();
        }
      } catch (error) {
        console.error('Erro na geração coletiva de horários:', error);
        // Marcar todos como erro
        await HorarioGerado.updateMany(
          { _id: { $in: horariosGerados.map(h => h._id) } },
          { status: 'erro' }
        );
      }
    }, 3000); // Simular 3 segundos de processamento

    res.status(201).json({
      success: true,
      message: 'Geração de horários coletivos iniciada com sucesso',
      data: {
        horariosIniciados: horariosGerados.length,
        horarios: horariosGerados.map(h => ({
          _id: h._id,
          titulo: h.titulo,
          professor: h.professor,
          status: h.status,
          criadoEm: h.criadoEm
        }))
      }
    });
  } catch (error) {
    console.error('Erro ao iniciar geração de horários coletivos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Funções auxiliares

function formatarGradeHorarios(horarios) {
  const grade = {
    segunda: [],
    terca: [],
    quarta: [],
    quinta: [],
    sexta: [],
    sabado: []
  };

  horarios.forEach(horario => {
    if (grade[horario.diaSemana]) {
      grade[horario.diaSemana].push({
        disciplina: horario.disciplina,
        sala: horario.sala,
        horarioInicio: horario.horarioInicio,
        horarioFim: horario.horarioFim,
        turno: horario.turno
      });
    }
  });

  // Ordenar por horário de início
  Object.keys(grade).forEach(dia => {
    grade[dia].sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));
  });

  return grade;
}

async function simularGeracaoHorarioIndividual(preferencias) {
  const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const horarios = [];

  if (!preferencias || !preferencias.disciplinas) {
    return horarios;
  }

  // Gerar horários baseados nas preferências e disponibilidade
  for (let i = 0; i < Math.min(preferencias.disciplinas.length, 6); i++) {
    const disciplina = preferencias.disciplinas[i];
    
    // Tentar usar disponibilidade configurada
    let diaEscolhido, turnoEscolhido, horarioInicio, horarioFim;
    
    if (preferencias.disponibilidadeHorarios && preferencias.disponibilidadeHorarios.length > 0) {
      const disponibilidade = preferencias.disponibilidadeHorarios[
        Math.floor(Math.random() * preferencias.disponibilidadeHorarios.length)
      ];
      
      diaEscolhido = disponibilidade.diaSemana;
      turnoEscolhido = disponibilidade.turno;
      
      if (disponibilidade.horarios && disponibilidade.horarios.length > 0) {
        const horarioDisponivel = disponibilidade.horarios[0];
        horarioInicio = horarioDisponivel.inicio;
        horarioFim = horarioDisponivel.fim;
      }
    }
    
    // Fallback para valores padrão
    if (!diaEscolhido) {
      diaEscolhido = diasSemana[Math.floor(Math.random() * diasSemana.length)];
    }
    
    if (!turnoEscolhido) {
      turnoEscolhido = ['manha', 'tarde', 'noite'][Math.floor(Math.random() * 3)];
    }
    
    if (!horarioInicio || !horarioFim) {
      switch (turnoEscolhido) {
        case 'manha':
          horarioInicio = '08:00';
          horarioFim = '10:00';
          break;
        case 'tarde':
          horarioInicio = '14:00';
          horarioFim = '16:00';
          break;
        case 'noite':
          horarioInicio = '19:00';
          horarioFim = '21:00';
          break;
      }
    }

    horarios.push({
      disciplina: disciplina.disciplina,
      sala: null, // Seria definido pelo algoritmo
      diaSemana: diaEscolhido,
      horarioInicio,
      horarioFim,
      turno: turnoEscolhido
    });
  }

  return horarios;
}

async function simularGeracaoHorarioColetivo(preferencias, parametros) {
  // Versão mais otimizada para geração coletiva
  const horarios = await simularGeracaoHorarioIndividual(preferencias);
  
  // Aplicar otimizações baseadas nos parâmetros
  if (parametros.otimizacao === 'recursos') {
    // Priorizar uso eficiente de salas
    horarios.forEach(horario => {
      horario.observacao = 'Otimizado para recursos';
    });
  } else if (parametros.otimizacao === 'preferencias') {
    // Priorizar preferências dos professores
    horarios.forEach(horario => {
      horario.observacao = 'Otimizado para preferências';
    });
  }
  
  return horarios;
}

