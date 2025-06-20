const express = require('express');
const { body, validationResult } = require('express-validator');
const Disciplina = require('../models/Disciplina');
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

// Listar todas as disciplinas
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, departamento, periodo, ativa } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { codigo: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (departamento) {
      query.departamento = departamento;
    }
    
    if (periodo) {
      query.periodo = parseInt(periodo);
    }
    
    if (ativa !== undefined) {
      query.ativa = ativa === 'true';
    }

    const disciplinas = await Disciplina.find(query)
      .populate('prerequisitos', 'codigo nome')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ codigo: 1 });

    const total = await Disciplina.countDocuments(query);

    res.json({
      success: true,
      data: {
        disciplinas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao listar disciplinas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Obter disciplina por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const disciplina = await Disciplina.findById(req.params.id)
      .populate('prerequisitos', 'codigo nome');
    
    if (!disciplina) {
      return res.status(404).json({
        success: false,
        message: 'Disciplina não encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        disciplina
      }
    });
  } catch (error) {
    console.error('Erro ao obter disciplina:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Criar nova disciplina (apenas admin)
router.post('/', adminAuth, [
  body('codigo')
    .trim()
    .notEmpty()
    .withMessage('Código é obrigatório')
    .isLength({ max: 20 })
    .withMessage('Código deve ter no máximo 20 caracteres'),
  body('nome')
    .trim()
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .isLength({ max: 200 })
    .withMessage('Nome deve ter no máximo 200 caracteres'),
  body('cargaHoraria')
    .isInt({ min: 1 })
    .withMessage('Carga horária deve ser um número inteiro maior que 0'),
  body('creditos')
    .isInt({ min: 1 })
    .withMessage('Créditos devem ser um número inteiro maior que 0'),
  body('departamento')
    .trim()
    .notEmpty()
    .withMessage('Departamento é obrigatório'),
  body('periodo')
    .isInt({ min: 1, max: 10 })
    .withMessage('Período deve ser um número entre 1 e 10'),
  body('prerequisitos')
    .optional()
    .isArray()
    .withMessage('Pré-requisitos devem ser um array')
], handleValidationErrors, async (req, res) => {
  try {
    const disciplina = new Disciplina(req.body);
    await disciplina.save();
    
    await disciplina.populate('prerequisitos', 'codigo nome');

    res.status(201).json({
      success: true,
      message: 'Disciplina criada com sucesso',
      data: {
        disciplina
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Código da disciplina já existe'
      });
    }
    
    console.error('Erro ao criar disciplina:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Atualizar disciplina (apenas admin)
router.put('/:id', adminAuth, [
  body('codigo')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Código não pode estar vazio')
    .isLength({ max: 20 })
    .withMessage('Código deve ter no máximo 20 caracteres'),
  body('nome')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Nome não pode estar vazio')
    .isLength({ max: 200 })
    .withMessage('Nome deve ter no máximo 200 caracteres'),
  body('cargaHoraria')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Carga horária deve ser um número inteiro maior que 0'),
  body('creditos')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Créditos devem ser um número inteiro maior que 0'),
  body('departamento')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Departamento não pode estar vazio'),
  body('periodo')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Período deve ser um número entre 1 e 10'),
  body('prerequisitos')
    .optional()
    .isArray()
    .withMessage('Pré-requisitos devem ser um array')
], handleValidationErrors, async (req, res) => {
  try {
    const disciplina = await Disciplina.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('prerequisitos', 'codigo nome');

    if (!disciplina) {
      return res.status(404).json({
        success: false,
        message: 'Disciplina não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Disciplina atualizada com sucesso',
      data: {
        disciplina
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Código da disciplina já existe'
      });
    }
    
    console.error('Erro ao atualizar disciplina:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Excluir disciplina (apenas admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const disciplina = await Disciplina.findByIdAndDelete(req.params.id);

    if (!disciplina) {
      return res.status(404).json({
        success: false,
        message: 'Disciplina não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Disciplina excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir disciplina:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

