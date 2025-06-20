const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  senha: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter no mínimo 6 caracteres']
  },
  tipo: {
    type: String,
    enum: ['professor', 'admin'],
    default: 'professor'
  },
  ativo: {
    type: Boolean,
    default: true
  },
  departamento: {
    type: String,
    trim: true
  },
  telefone: {
    type: String,
    trim: true
  },
  criadoEm: {
    type: Date,
    default: Date.now
  },
  atualizadoEm: {
    type: Date,
    default: Date.now
  }
});

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware para atualizar atualizadoEm
userSchema.pre('save', function(next) {
  this.atualizadoEm = Date.now();
  next();
});

// Método para comparar senhas
userSchema.methods.compararSenha = async function(senhaCandidata) {
  return await bcrypt.compare(senhaCandidata, this.senha);
};

// Método para retornar dados do usuário sem a senha
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.senha;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);

