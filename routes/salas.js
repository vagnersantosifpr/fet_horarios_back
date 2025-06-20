const express = require('express');
const { body, validationResult } = require('express-validator');
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

// Listar todas as salas
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, tipo, bloco, disponivel } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { codigo: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tipo) {
      query.tipo = tipo;
    }
    
    if (bloco) {
      query.bloco = bloco;
    }
    
    if (disponivel !== undefined) {
      query.disponivel = disponivel === 'true';
    }

    const salas = await Sala.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ codigo: 1 });

    const total = await Sala.countDocuments(query);

    res.json({
      success: true,
      data: {
        salas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao listar salas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Obter sala por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const sala = await Sala.findById(req.params.id);
    
    if (!sala) {
      return res.status(404).json({
        success: false,
        message: 'Sala não encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        sala
      }
    });
  } catch (error) {
    console.error('Erro ao obter sala:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Criar nova sala (apenas admin)
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
    .isLength({ max: 100 })
    .withMessage('Nome deve ter no máximo 100 caracteres'),
  body('capacidade')
    .isInt({ min: 1 })
    .withMessage('Capacidade deve ser um número inteiro maior que 0'),
  body('tipo')
    .isIn(['laboratorio', 'sala_aula', 'auditorio', 'sala_multimidia'])
    .withMessage('Tipo deve ser: laboratorio, sala_aula, auditorio ou sala_multimidia'),
  body('bloco')
    .trim()
    .notEmpty()
    .withMessage('Bloco é obrigatório'),
  body('andar')
    .isInt({ min: 0 })
    .withMessage('Andar deve ser um número inteiro maior ou igual a 0'),
  body('recursos')
    .optional()
    .isArray()
    .withMessage('Recursos devem ser um array'),
  body('recursos.*')
    .optional()
    .isIn(['projetor', 'ar_condicionado', 'quadro_digital', 'computadores', 'som', 'microfone'])
    .withMessage('Recurso inválido'),
  body('observacoes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const sala = new Sala(req.body);
    await sala.save();

    res.status(201).json({
      success: true,
      message: 'Sala criada com sucesso',
      data: {
        sala
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Código da sala já existe'
      });
    }
    
    console.error('Erro ao criar sala:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Atualizar sala (apenas admin)
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
    .isLength({ max: 100 })
    .withMessage('Nome deve ter no máximo 100 caracteres'),
  body('capacidade')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacidade deve ser um número inteiro maior que 0'),
  body('tipo')
    .optional()
    .isIn(['laboratorio', 'sala_aula', 'auditorio', 'sala_multimidia'])
    .withMessage('Tipo deve ser: laboratorio, sala_aula, auditorio ou sala_multimidia'),
  body('bloco')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Bloco não pode estar vazio'),
  body('andar')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Andar deve ser um número inteiro maior ou igual a 0'),
  body('recursos')
    .optional()
    .isArray()
    .withMessage('Recursos devem ser um array'),
  body('recursos.*')
    .optional()
    .isIn(['projetor', 'ar_condicionado', 'quadro_digital', 'computadores', 'som', 'microfone'])
    .withMessage('Recurso inválido'),
  body('observacoes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const sala = await Sala.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!sala) {
      return res.status(404).json({
        success: false,
        message: 'Sala não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Sala atualizada com sucesso',
      data: {
        sala
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Código da sala já existe'
      });
    }
    
    console.error('Erro ao atualizar sala:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Excluir sala (apenas admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const sala = await Sala.findByIdAndDelete(req.params.id);

    if (!sala) {
      return res.status(404).json({
        success: false,
        message: 'Sala não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Sala excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir sala:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

