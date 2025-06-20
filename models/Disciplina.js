const mongoose = require('mongoose');

const disciplinaSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'Código da disciplina é obrigatório'],
    unique: true,
    trim: true,
    uppercase: true
  },
  nome: {
    type: String,
    required: [true, 'Nome da disciplina é obrigatório'],
    trim: true,
    maxlength: [200, 'Nome deve ter no máximo 200 caracteres']
  },
  cargaHoraria: {
    type: Number,
    required: [true, 'Carga horária é obrigatória'],
    min: [1, 'Carga horária deve ser maior que 0']
  },
  creditos: {
    type: Number,
    required: [true, 'Créditos são obrigatórios'],
    min: [1, 'Créditos devem ser maior que 0']
  },
  departamento: {
    type: String,
    required: [true, 'Departamento é obrigatório'],
    trim: true
  },
  periodo: {
    type: Number,
    required: [true, 'Período é obrigatório'],
    min: [1, 'Período deve ser maior que 0'],
    max: [10, 'Período deve ser menor ou igual a 10']
  },
  prerequisitos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Disciplina'
  }],
  ativa: {
    type: Boolean,
    default: true
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

// Middleware para atualizar atualizadoEm
disciplinaSchema.pre('save', function(next) {
  this.atualizadoEm = Date.now();
  next();
});

module.exports = mongoose.model('Disciplina', disciplinaSchema);

