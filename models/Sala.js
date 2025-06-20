const mongoose = require('mongoose');

const salaSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'Código da sala é obrigatório'],
    unique: true,
    trim: true,
    uppercase: true
  },
  nome: {
    type: String,
    required: [true, 'Nome da sala é obrigatório'],
    trim: true
  },
  capacidade: {
    type: Number,
    required: [true, 'Capacidade é obrigatória'],
    min: [1, 'Capacidade deve ser maior que 0']
  },
  tipo: {
    type: String,
    enum: ['laboratorio', 'sala_aula', 'auditorio', 'sala_multimidia'],
    required: [true, 'Tipo da sala é obrigatório']
  },
  bloco: {
    type: String,
    required: [true, 'Bloco é obrigatório'],
    trim: true
  },
  andar: {
    type: Number,
    required: [true, 'Andar é obrigatório'],
    min: [0, 'Andar deve ser maior ou igual a 0']
  },
  recursos: [{
    type: String,
    enum: ['projetor', 'ar_condicionado', 'quadro_digital', 'computadores', 'som', 'microfone']
  }],
  disponivel: {
    type: Boolean,
    default: true
  },
  observacoes: {
    type: String,
    trim: true,
    maxlength: [500, 'Observações devem ter no máximo 500 caracteres']
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
salaSchema.pre('save', function(next) {
  this.atualizadoEm = Date.now();
  next();
});

module.exports = mongoose.model('Sala', salaSchema);

