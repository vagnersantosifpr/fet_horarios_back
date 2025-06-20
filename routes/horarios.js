const express = require('express');
const { body, validationResult } = require('express-validator');
const HorarioGerado = require('../models/HorarioGerado');
const ProfessorPreferencia = require('../models/ProfessorPreferencia');
const { auth } = require('../middleware/auth');

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

// Listar horários do professor logado
router.get('/my-horarios', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, semestre, status } = req.query;
    
    const query = { professor: req.user._id };
    
    if (semestre) {
      query.semestre = semestre;
    }
    
    if (status) {
      query.status = status;
    }

    const horarios = await HorarioGerado.find(query)
      .populate('professor', 'nome email')
      .populate('horarios.disciplina', 'codigo nome cargaHoraria')
      .populate('horarios.sala', 'codigo nome capacidade')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ criadoEm: -1 });

    const total = await HorarioGerado.countDocuments(query);

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
    console.error('Erro ao listar horários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Obter horário específico
router.get('/:id', auth, async (req, res) => {
  try {
    const horario = await HorarioGerado.findOne({
      _id: req.params.id,
      professor: req.user._id
    })
    .populate('professor', 'nome email departamento')
    .populate('horarios.disciplina', 'codigo nome cargaHoraria creditos')
    .populate('horarios.sala', 'codigo nome capacidade tipo bloco andar');

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horário não encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        horario
      }
    });
  } catch (error) {
    console.error('Erro ao obter horário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Gerar novo horário
router.post('/gerar', auth, [
  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('Título é obrigatório')
    .isLength({ max: 100 })
    .withMessage('Título deve ter no máximo 100 caracteres'),
  body('semestre')
    .matches(/^\d{4}\.[1-2]$/)
    .withMessage('Formato de semestre inválido (YYYY.1 ou YYYY.2)'),
  body('parametrosAlgoritmo.populacao')
    .optional()
    .isInt({ min: 10, max: 200 })
    .withMessage('População deve ser entre 10 e 200'),
  body('parametrosAlgoritmo.geracoes')
    .optional()
    .isInt({ min: 10, max: 1000 })
    .withMessage('Gerações devem ser entre 10 e 1000'),
  body('parametrosAlgoritmo.taxaMutacao')
    .optional()
    .isFloat({ min: 0.01, max: 1 })
    .withMessage('Taxa de mutação deve ser entre 0.01 e 1'),
  body('parametrosAlgoritmo.tipoCruzamento')
    .optional()
    .isIn([1, 2])
    .withMessage('Tipo de cruzamento deve ser 1 ou 2'),
  body('observacoes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Observações devem ter no máximo 1000 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    // Verificar se o professor tem preferências configuradas
    const preferencias = await ProfessorPreferencia.findOne({ professor: req.user._id });
    
    if (!preferencias || !preferencias.disciplinas || preferencias.disciplinas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário configurar suas preferências e disciplinas antes de gerar um horário'
      });
    }

    const { titulo, semestre, parametrosAlgoritmo = {}, observacoes } = req.body;

    // Criar registro do horário com status 'gerando'
    const horario = new HorarioGerado({
      titulo,
      professor: req.user._id,
      semestre,
      parametrosAlgoritmo: {
        populacao: parametrosAlgoritmo.populacao || 50,
        geracoes: parametrosAlgoritmo.geracoes || 100,
        taxaMutacao: parametrosAlgoritmo.taxaMutacao || 0.1,
        tipoCruzamento: parametrosAlgoritmo.tipoCruzamento || 1
      },
      observacoes,
      status: 'gerando'
    });

    await horario.save();

    // Aqui seria chamado o algoritmo genético de forma assíncrona
    // Por enquanto, vamos simular o processo
    setTimeout(async () => {
      try {
        // Simular geração de horário (aqui seria integrado com o algoritmo genético real)
        const horariosSimulados = await simularGeracaoHorario(preferencias);
        
        horario.horarios = horariosSimulados;
        horario.status = 'concluido';
        horario.fitnessScore = Math.floor(Math.random() * 40) + 60; // Score entre 60-100
        horario.tempoExecucao = Math.floor(Math.random() * 120) + 30; // 30-150 segundos
        
        await horario.save();
      } catch (error) {
        console.error('Erro na geração do horário:', error);
        horario.status = 'erro';
        await horario.save();
      }
    }, 2000); // Simular 2 segundos de processamento

    res.status(201).json({
      success: true,
      message: 'Geração de horário iniciada com sucesso',
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
    console.error('Erro ao iniciar geração de horário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Função para simular a geração de horário (substituir pela integração real)
async function simularGeracaoHorario(preferencias) {
  const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const turnos = ['manha', 'tarde', 'noite'];
  const horarios = [];

  // Simular horários baseados nas disciplinas do professor
  for (let i = 0; i < Math.min(preferencias.disciplinas.length, 5); i++) {
    const disciplina = preferencias.disciplinas[i];
    const diaAleatorio = diasSemana[Math.floor(Math.random() * diasSemana.length)];
    const turnoAleatorio = turnos[Math.floor(Math.random() * turnos.length)];
    
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

    horarios.push({
      disciplina: disciplina.disciplina,
      sala: null, // Seria definido pelo algoritmo
      diaSemana: diaAleatorio,
      horarioInicio,
      horarioFim,
      turno: turnoAleatorio
    });
  }

  return horarios;
}

// Cancelar geração de horário
router.put('/:id/cancelar', auth, async (req, res) => {
  try {
    const horario = await HorarioGerado.findOne({
      _id: req.params.id,
      professor: req.user._id,
      status: 'gerando'
    });

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horário não encontrado ou não pode ser cancelado'
      });
    }

    horario.status = 'cancelado';
    await horario.save();

    res.json({
      success: true,
      message: 'Geração de horário cancelada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cancelar horário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Excluir horário
router.delete('/:id', auth, async (req, res) => {
  try {
    const horario = await HorarioGerado.findOneAndDelete({
      _id: req.params.id,
      professor: req.user._id
    });

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horário não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Horário excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir horário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

