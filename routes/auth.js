const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

// Registro de usuário
router.post('/register', [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),
  body('departamento')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Departamento deve ter no máximo 100 caracteres'),
  body('telefone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\(\)\+]+$/)
    .withMessage('Telefone inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const { nome, email, senha, departamento, telefone } = req.body;

    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já existe com este email'
      });
    }

    // Criar novo usuário
    const user = new User({
      nome,
      email,
      senha,
      departamento,
      telefone
    });

    await user.save();

    // Gerar token JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Login de usuário
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('senha')
    .notEmpty()
    .withMessage('Senha é obrigatória')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Buscar usuário
    const user = await User.findOne({ email }).select('+senha');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Verificar se o usuário está ativo
    if (!user.ativo) {
      return res.status(401).json({
        success: false,
        message: 'Usuário inativo'
      });
    }

    // Verificar senha
    const isPasswordValid = await user.compararSenha(senha);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remover senha da resposta
    user.senha = undefined;

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Obter perfil do usuário logado
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Atualizar perfil do usuário
router.put('/profile', auth, [
  body('nome')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('departamento')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Departamento deve ter no máximo 100 caracteres'),
  body('telefone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\(\)\+]+$/)
    .withMessage('Telefone inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const { nome, departamento, telefone } = req.body;
    
    const updateData = {};
    if (nome) updateData.nome = nome;
    if (departamento) updateData.departamento = departamento;
    if (telefone) updateData.telefone = telefone;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Alterar senha
router.put('/change-password', auth, [
  body('senhaAtual')
    .notEmpty()
    .withMessage('Senha atual é obrigatória'),
  body('novaSenha')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter no mínimo 6 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    // Buscar usuário com senha
    const user = await User.findById(req.user._id).select('+senha');
    
    // Verificar senha atual
    const isCurrentPasswordValid = await user.compararSenha(senhaAtual);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Atualizar senha
    user.senha = novaSenha;
    await user.save();

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

