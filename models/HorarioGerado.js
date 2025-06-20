const mongoose = require('mongoose');

const horarioGeradoSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true
  },
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Professor é obrigatório']
  },
  semestre: {
    type: String,
    required: [true, 'Semestre é obrigatório'],
    match: [/^\d{4}\.[1-2]$/, 'Formato de semestre inválido (YYYY.1 ou YYYY.2)']
  },
  parametrosAlgoritmo: {
    populacao: {
      type: Number,
      default: 50,
      min: [10, 'População deve ser maior ou igual a 10']
    },
    geracoes: {
      type: Number,
      default: 100,
      min: [10, 'Gerações devem ser maior ou igual a 10']
    },
    taxaMutacao: {
      type: Number,
      default: 0.1,
      min: [0.01, 'Taxa de mutação deve ser maior que 0.01'],
      max: [1, 'Taxa de mutação deve ser menor ou igual a 1']
    },
    tipoCruzamento: {
      type: Number,
      enum: [1, 2],
      default: 1 // 1 = um corte, 2 = dois cortes
    }
  },
  horarios: [{
    disciplina: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disciplina',
      required: true
    },
    sala: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sala',
      required: true
    },
    diaSemana: {
      type: String,
      enum: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
      required: true
    },
    horarioInicio: {
      type: String,
      required: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
    },
    horarioFim: {
      type: String,
      required: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
    },
    turno: {
      type: String,
      enum: ['manha', 'tarde', 'noite'],
      required: true
    }
  }],
  restricoesVioladas: [{
    tipo: String,
    descricao: String,
    severidade: {
      type: String,
      enum: ['baixa', 'media', 'alta'],
      default: 'media'
    }
  }],
  fitnessScore: {
    type: Number,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['gerando', 'concluido', 'erro', 'cancelado'],
    default: 'gerando'
  },
  tempoExecucao: {
    type: Number, // em segundos
    min: 0
  },
  observacoes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Observações devem ter no máximo 1000 caracteres']
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
horarioGeradoSchema.pre('save', function(next) {
  this.atualizadoEm = Date.now();
  next();
});

module.exports = mongoose.model('HorarioGerado', horarioGeradoSchema);

