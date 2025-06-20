const express = require('express');
const { body, validationResult } = require('express-validator');
const HorarioColetivo = require('../models/HorarioColetivo');
const ProfessorPreferencia = require('../models/ProfessorPreferencia');
const User = require('../models/User');
const Disciplina = require('../models/Disciplina');
const Sala = require('../models/Sala');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Middleware para capturar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array()
    });
  }
  next();
};

// Listar horários coletivos (apenas admins)
router.get('/coletivos', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, semestre, status } = req.query;
    
    const query = {};
    
    if (semestre) {
      query.semestre = semestre;
    }
    
    if (status) {
      query.status = status;
    }

    const horarios = await HorarioColetivo.find(query)
      .populate('administrador', 'nome email')
      .populate('professores', 'nome email departamento')
      .populate('disciplinas', 'codigo nome cargaHoraria')
      .populate('salas', 'codigo nome capacidade')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ criadoEm: -1 });

    const total = await HorarioColetivo.countDocuments(query);

    res.json({
      success: true,
      data: {
        horarios,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao listar horários coletivos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Obter horário coletivo específico (apenas admins)
router.get('/coletivos/:id', adminAuth, async (req, res) => {
  try {
    const horario = await HorarioColetivo.findById(req.params.id)
      .populate('administrador', 'nome email departamento')
      .populate('professores', 'nome email departamento')
      .populate('disciplinas', 'codigo nome cargaHoraria creditos')
      .populate('salas', 'codigo nome capacidade tipo bloco andar')
      .populate('horariosGerados.professor', 'nome email')
      .populate('horariosGerados.horarios.disciplina', 'codigo nome')
      .populate('horariosGerados.horarios.sala', 'codigo nome')
      .populate('conflitosDetectados.professoresEnvolvidos', 'nome email')
      .populate('conflitosDetectados.disciplinasEnvolvidas', 'codigo nome')
      .populate('conflitosDetectados.salasEnvolvidas', 'codigo nome');

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horário coletivo não encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        horario
      }
    });
  } catch (error) {
    console.error('Erro ao obter horário coletivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Gerar novo horário coletivo (apenas admins)
router.post('/gerar-coletivo', adminAuth, [
  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('Título é obrigatório')
    .isLength({ max: 100 })
    .withMessage('Título deve ter no máximo 100 caracteres'),
  body('semestre')
    .matches(/^\d{4}\.[1-2]$/)
    .withMessage('Formato de semestre inválido (YYYY.1 ou YYYY.2)'),
  body('professores')
    .isArray({ min: 1 })
    .withMessage('Deve incluir pelo menos um professor'),
  body('professores.*')
    .isMongoId()
    .withMessage('ID de professor inválido'),
  body('disciplinas')
    .isArray({ min: 1 })
    .withMessage('Deve incluir pelo menos uma disciplina'),
  body('disciplinas.*')
    .isMongoId()
    .withMessage('ID de disciplina inválido'),
  body('salas')
    .isArray({ min: 1 })
    .withMessage('Deve incluir pelo menos uma sala'),
  body('salas.*')
    .isMongoId()
    .withMessage('ID de sala inválido'),
  body('parametrosAlgoritmo.populacao')
    .optional()
    .isInt({ min: 20, max: 500 })
    .withMessage('População deve ser entre 20 e 500'),
  body('parametrosAlgoritmo.geracoes')
    .optional()
    .isInt({ min: 50, max: 2000 })
    .withMessage('Gerações devem ser entre 50 e 2000'),
  body('parametrosAlgoritmo.taxaMutacao')
    .optional()
    .isFloat({ min: 0.01, max: 1 })
    .withMessage('Taxa de mutação deve ser entre 0.01 e 1'),
  body('parametrosAlgoritmo.tipoCruzamento')
    .optional()
    .isIn([1, 2])
    .withMessage('Tipo de cruzamento deve ser 1 ou 2'),
  body('parametrosAlgoritmo.pesoPreferencias')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Peso das preferências deve ser entre 0 e 1'),
  body('parametrosAlgoritmo.pesoConflitos')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Peso dos conflitos deve ser entre 0 e 1'),
  body('restricoesGlobais')
    .optional()
    .isArray()
    .withMessage('Restrições globais devem ser um array'),
  body('observacoes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Observações devem ter no máximo 2000 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const { 
      titulo, 
      semestre, 
      professores, 
      disciplinas, 
      salas, 
      parametrosAlgoritmo = {}, 
      restricoesGlobais = [],
      observacoes 
    } = req.body;

    // Verificar se os professores existem e são válidos
    const professoresValidos = await User.find({
      _id: { $in: professores },
      tipo: 'professor',
      ativo: true
    });

    if (professoresValidos.length !== professores.length) {
      return res.status(400).json({
        success: false,
        message: 'Um ou mais professores são inválidos ou inativos'
      });
    }

    // Verificar se as disciplinas existem
    const disciplinasValidas = await Disciplina.find({
      _id: { $in: disciplinas },
      ativo: true
    });

    if (disciplinasValidas.length !== disciplinas.length) {
      return res.status(400).json({
        success: false,
        message: 'Uma ou mais disciplinas são inválidas ou inativas'
      });
    }

    // Verificar se as salas existem
    const salasValidas = await Sala.find({
      _id: { $in: salas },
      ativo: true
    });

    if (salasValidas.length !== salas.length) {
      return res.status(400).json({
        success: false,
        message: 'Uma ou mais salas são inválidas ou inativas'
      });
    }

    // Verificar se os professores têm preferências configuradas
    const preferenciasCount = await ProfessorPreferencia.countDocuments({
      professor: { $in: professores },
      'disciplinas.0': { $exists: true }
    });

    if (preferenciasCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum dos professores selecionados possui preferências configuradas'
      });
    }

    // Criar registro do horário coletivo com status 'gerando'
    const horarioColetivo = new HorarioColetivo({
      titulo,
      administrador: req.user._id,
      semestre,
      professores,
      disciplinas,
      salas,
      parametrosAlgoritmo: {
        populacao: parametrosAlgoritmo.populacao || 100,
        geracoes: parametrosAlgoritmo.geracoes || 200,
        taxaMutacao: parametrosAlgoritmo.taxaMutacao || 0.1,
        tipoCruzamento: parametrosAlgoritmo.tipoCruzamento || 1,
        pesoPreferencias: parametrosAlgoritmo.pesoPreferencias || 0.3,
        pesoConflitos: parametrosAlgoritmo.pesoConflitos || 0.7
      },
      restricoesGlobais,
      observacoes,
      status: 'gerando'
    });

    await horarioColetivo.save();

    // Aqui seria chamado o algoritmo genético de forma assíncrona
    // Por enquanto, vamos simular o processo
    setTimeout(async () => {
      try {
        // Simular geração de horário coletivo
        const resultadoGeracao = await simularGeracaoHorarioColetivo(
          professoresValidos, 
          disciplinasValidas, 
          salasValidas,
          horarioColetivo.parametrosAlgoritmo
        );
        
        horarioColetivo.horariosGerados = resultadoGeracao.horariosGerados;
        horarioColetivo.conflitosDetectados = resultadoGeracao.conflitosDetectados;
        horarioColetivo.status = 'concluido';
        horarioColetivo.fitnessScore = resultadoGeracao.fitnessScore;
        horarioColetivo.tempoExecucao = resultadoGeracao.tempoExecucao;
        
        await horarioColetivo.save();
      } catch (error) {
        console.error('Erro na geração do horário coletivo:', error);
        horarioColetivo.status = 'erro';
        await horarioColetivo.save();
      }
    }, 5000); // Simular 5 segundos de processamento

    res.status(201).json({
      success: true,
      message: 'Geração de horário coletivo iniciada com sucesso',
      data: {
        horario: {
          _id: horarioColetivo._id,
          titulo: horarioColetivo.titulo,
          status: horarioColetivo.status,
          professores: horarioColetivo.professores.length,
          disciplinas: horarioColetivo.disciplinas.length,
          salas: horarioColetivo.salas.length,
          criadoEm: horarioColetivo.criadoEm
        }
      }
    });
  } catch (error) {
    console.error('Erro ao iniciar geração de horário coletivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Função para simular a geração de horário coletivo (substituir pela integração real)
async function simularGeracaoHorarioColetivo(professores, disciplinas, salas, parametros) {
  const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const turnos = ['manha', 'tarde', 'noite'];
  const horariosGerados = [];
  const conflitosDetectados = [];

  // Simular horários para cada professor
  for (const professor of professores) {
    const horariosProfessor = [];
    
    // Buscar preferências do professor
    const preferencias = await ProfessorPreferencia.findOne({ professor: professor._id });
    const disciplinasProfessor = preferencias ? 
      preferencias.disciplinas.slice(0, 3) : // Máximo 3 disciplinas por professor
      disciplinas.slice(0, 2); // Se não tem preferências, pegar 2 disciplinas aleatórias

    for (let i = 0; i < disciplinasProfessor.length; i++) {
      const disciplina = disciplinasProfessor[i].disciplina || disciplinasProfessor[i];
      const diaAleatorio = diasSemana[Math.floor(Math.random() * diasSemana.length)];
      const turnoAleatorio = turnos[Math.floor(Math.random() * turnos.length)];
      const salaAleatoria = salas[Math.floor(Math.random() * salas.length)];
      
      let horarioInicio, horarioFim;
      switch (turnoAleatorio) {
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

      horariosProfessor.push({
        disciplina: disciplina._id || disciplina,
        sala: salaAleatoria._id,
        diaSemana: diaAleatorio,
        horarioInicio,
        horarioFim,
        turno: turnoAleatorio
      });
    }

    horariosGerados.push({
      professor: professor._id,
      horarios: horariosProfessor
    });
  }

  // Simular alguns conflitos
  if (Math.random() > 0.7) { // 30% de chance de conflito
    conflitosDetectados.push({
      tipo: 'conflito_sala',
      descricao: 'Duas disciplinas agendadas para a mesma sala no mesmo horário',
      professoresEnvolvidos: [professores[0]._id, professores[1]._id],
      salasEnvolvidas: [salas[0]._id],
      severidade: 'alta'
    });
  }

  return {
    horariosGerados,
    conflitosDetectados,
    fitnessScore: Math.floor(Math.random() * 30) + 70, // Score entre 70-100
    tempoExecucao: Math.floor(Math.random() * 300) + 120 // 120-420 segundos
  };
}

// Cancelar geração de horário coletivo (apenas admins)
router.put('/coletivos/:id/cancelar', adminAuth, async (req, res) => {
  try {
    const horario = await HorarioColetivo.findOne({
      _id: req.params.id,
      status: 'gerando'
    });

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horário coletivo não encontrado ou não pode ser cancelado'
      });
    }

    horario.status = 'cancelado';
    await horario.save();

    res.json({
      success: true,
      message: 'Geração de horário coletivo cancelada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cancelar horário coletivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Excluir horário coletivo (apenas admins)
router.delete('/coletivos/:id', adminAuth, async (req, res) => {
  try {
    const horario = await HorarioColetivo.findByIdAndDelete(req.params.id);

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horário coletivo não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Horário coletivo excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir horário coletivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Obter estatísticas dos horários coletivos (apenas admins)
router.get('/coletivos/estatisticas/geral', adminAuth, async (req, res) => {
  try {
    const { semestre } = req.query;
    const query = semestre ? { semestre } : {};

    const estatisticas = await HorarioColetivo.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalHorarios: { $sum: 1 },
          horariosCompletos: {
            $sum: { $cond: [{ $eq: ['$status', 'concluido'] }, 1, 0] }
          },
          horariosEmAndamento: {
            $sum: { $cond: [{ $eq: ['$status', 'gerando'] }, 1, 0] }
          },
          horariosComErro: {
            $sum: { $cond: [{ $eq: ['$status', 'erro'] }, 1, 0] }
          },
          mediaFitnessScore: { $avg: '$fitnessScore' },
          mediaTempoExecucao: { $avg: '$tempoExecucao' },
          totalProfessoresEnvolvidos: { $sum: { $size: '$professores' } },
          totalDisciplinasEnvolvidas: { $sum: { $size: '$disciplinas' } }
        }
      }
    ]);

    const resultado = estatisticas[0] || {
      totalHorarios: 0,
      horariosCompletos: 0,
      horariosEmAndamento: 0,
      horariosComErro: 0,
      mediaFitnessScore: 0,
      mediaTempoExecucao: 0,
      totalProfessoresEnvolvidos: 0,
      totalDisciplinasEnvolvidas: 0
    };

    res.json({
      success: true,
      data: {
        estatisticas: resultado
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

