const express = require('express');
const { body, validationResult } = require('express-validator');
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

// Obter preferências do professor logado
router.get('/my-preferences', auth, async (req, res) => {
  try {
    const preferencia = await ProfessorPreferencia.findOne({ professor: req.user._id })
      .populate('disciplinas.disciplina', 'codigo nome cargaHoraria')
      .populate('professor', 'nome email departamento');

    if (!preferencia) {
      return res.json({
        success: true,
        data: {
          preferencia: null
        }
      });
    }

    res.json({
      success: true,
      data: {
        preferencia
      }
    });
  } catch (error) {
    console.error('Erro ao obter preferências:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Criar ou atualizar preferências do professor
router.post('/my-preferences', auth, [
  body('disciplinas')
    .optional()
    .isArray()
    .withMessage('Disciplinas devem ser um array'),
  body('disciplinas.*.disciplina')
    .optional()
    .isMongoId()
    .withMessage('ID da disciplina inválido'),
  body('disciplinas.*.preferencia')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Preferência deve ser um número entre 1 e 5'),
  body('disponibilidadeHorarios')
    .optional()
    .isArray()
    .withMessage('Disponibilidade de horários deve ser um array'),
  body('disponibilidadeHorarios.*.diaSemana')
    .optional()
    .isIn(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'])
    .withMessage('Dia da semana inválido'),
  body('disponibilidadeHorarios.*.turno')
    .optional()
    .isIn(['manha', 'tarde', 'noite'])
    .withMessage('Turno inválido'),
  body('disponibilidadeHorarios.*.horarios')
    .optional()
    .isArray()
    .withMessage('Horários devem ser um array'),
  body('disponibilidadeHorarios.*.horarios.*.inicio')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de início inválido (HH:MM)'),
  body('disponibilidadeHorarios.*.horarios.*.fim')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de fim inválido (HH:MM)'),
  body('restricoes')
    .optional()
    .isArray()
    .withMessage('Restrições devem ser um array'),
  body('restricoes.*.tipo')
    .optional()
    .isIn(['nao_consecutivo', 'intervalo_minimo', 'sala_preferida', 'turno_preferido'])
    .withMessage('Tipo de restrição inválido'),
  body('restricoes.*.descricao')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Descrição da restrição é obrigatória'),
  body('restricoes.*.prioridade')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Prioridade deve ser um número entre 1 e 5'),
  body('cargaHorariaMaxima')
    .optional()
    .isInt({ min: 1, max: 40 })
    .withMessage('Carga horária máxima deve ser entre 1 e 40'),
  body('observacoes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Observações devem ter no máximo 1000 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const dadosPreferencia = {
      ...req.body,
      professor: req.user._id
    };

    const preferencia = await ProfessorPreferencia.findOneAndUpdate(
      { professor: req.user._id },
      dadosPreferencia,
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    ).populate('disciplinas.disciplina', 'codigo nome cargaHoraria')
     .populate('professor', 'nome email departamento');

    res.json({
      success: true,
      message: 'Preferências salvas com sucesso',
      data: {
        preferencia
      }
    });
  } catch (error) {
    console.error('Erro ao salvar preferências:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Adicionar disciplina às preferências
router.post('/my-preferences/disciplinas', auth, [
  body('disciplina')
    .isMongoId()
    .withMessage('ID da disciplina inválido'),
  body('preferencia')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Preferência deve ser um número entre 1 e 5')
], handleValidationErrors, async (req, res) => {
  try {
    const { disciplina, preferencia = 3 } = req.body;

    let professorPreferencia = await ProfessorPreferencia.findOne({ professor: req.user._id });
    
    if (!professorPreferencia) {
      professorPreferencia = new ProfessorPreferencia({
        professor: req.user._id,
        disciplinas: []
      });
    }

    // Verificar se a disciplina já existe nas preferências
    const disciplinaExistente = professorPreferencia.disciplinas.find(
      d => d.disciplina.toString() === disciplina
    );

    if (disciplinaExistente) {
      return res.status(400).json({
        success: false,
        message: 'Disciplina já adicionada às preferências'
      });
    }

    professorPreferencia.disciplinas.push({ disciplina, preferencia });
    await professorPreferencia.save();

    await professorPreferencia.populate('disciplinas.disciplina', 'codigo nome cargaHoraria');

    res.json({
      success: true,
      message: 'Disciplina adicionada às preferências',
      data: {
        preferencia: professorPreferencia
      }
    });
  } catch (error) {
    console.error('Erro ao adicionar disciplina:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Remover disciplina das preferências
router.delete('/my-preferences/disciplinas/:disciplinaId', auth, async (req, res) => {
  try {
    const professorPreferencia = await ProfessorPreferencia.findOne({ professor: req.user._id });
    
    if (!professorPreferencia) {
      return res.status(404).json({
        success: false,
        message: 'Preferências não encontradas'
      });
    }

    professorPreferencia.disciplinas = professorPreferencia.disciplinas.filter(
      d => d.disciplina.toString() !== req.params.disciplinaId
    );

    await professorPreferencia.save();
    await professorPreferencia.populate('disciplinas.disciplina', 'codigo nome cargaHoraria');

    res.json({
      success: true,
      message: 'Disciplina removida das preferências',
      data: {
        preferencia: professorPreferencia
      }
    });
  } catch (error) {
    console.error('Erro ao remover disciplina:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Adicionar disponibilidade de horário
router.post('/my-preferences/disponibilidade', auth, [
  body('diaSemana')
    .isIn(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'])
    .withMessage('Dia da semana inválido'),
  body('turno')
    .isIn(['manha', 'tarde', 'noite'])
    .withMessage('Turno inválido'),
  body('horarios')
    .isArray({ min: 1 })
    .withMessage('Horários devem ser um array com pelo menos um item'),
  body('horarios.*.inicio')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de início inválido (HH:MM)'),
  body('horarios.*.fim')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora de fim inválido (HH:MM)')
], handleValidationErrors, async (req, res) => {
  try {
    const { diaSemana, turno, horarios } = req.body;

    let professorPreferencia = await ProfessorPreferencia.findOne({ professor: req.user._id });
    
    if (!professorPreferencia) {
      professorPreferencia = new ProfessorPreferencia({
        professor: req.user._id,
        disponibilidadeHorarios: []
      });
    }

    // Verificar se já existe disponibilidade para este dia e turno
    const disponibilidadeExistente = professorPreferencia.disponibilidadeHorarios.find(
      d => d.diaSemana === diaSemana && d.turno === turno
    );

    if (disponibilidadeExistente) {
      return res.status(400).json({
        success: false,
        message: 'Disponibilidade já existe para este dia e turno'
      });
    }

    professorPreferencia.disponibilidadeHorarios.push({
      diaSemana,
      turno,
      horarios,
      disponivel: true
    });

    await professorPreferencia.save();

    res.json({
      success: true,
      message: 'Disponibilidade adicionada com sucesso',
      data: {
        preferencia: professorPreferencia
      }
    });
  } catch (error) {
    console.error('Erro ao adicionar disponibilidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Adicionar restrição
router.post('/my-preferences/restricoes', auth, [
  body('tipo')
    .isIn(['nao_consecutivo', 'intervalo_minimo', 'sala_preferida', 'turno_preferido'])
    .withMessage('Tipo de restrição inválido'),
  body('descricao')
    .trim()
    .notEmpty()
    .withMessage('Descrição da restrição é obrigatória'),
  body('prioridade')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Prioridade deve ser um número entre 1 e 5')
], handleValidationErrors, async (req, res) => {
  try {
    const { tipo, descricao, valor, prioridade = 3 } = req.body;

    let professorPreferencia = await ProfessorPreferencia.findOne({ professor: req.user._id });
    
    if (!professorPreferencia) {
      professorPreferencia = new ProfessorPreferencia({
        professor: req.user._id,
        restricoes: []
      });
    }

    professorPreferencia.restricoes.push({
      tipo,
      descricao,
      valor,
      prioridade
    });

    await professorPreferencia.save();

    res.json({
      success: true,
      message: 'Restrição adicionada com sucesso',
      data: {
        preferencia: professorPreferencia
      }
    });
  } catch (error) {
    console.error('Erro ao adicionar restrição:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

