const mongoose = require('mongoose');

const professorPreferenciaSchema = new mongoose.Schema({
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Professor é obrigatório']
  },
  disciplinas: [{
    disciplina: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disciplina',
      required: true
    },
    preferencia: {
      type: Number,
      min: 1,
      max: 5,
      default: 3 // 1 = não gosta, 5 = adora lecionar
    }
  }],
  disponibilidadeHorarios: [{
    diaSemana: {
      type: String,
      enum: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
      required: true
    },
    turno: {
      type: String,
      enum: ['manha', 'tarde', 'noite'],
      required: true
    },
    horarios: [{
      inicio: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      },
      fim: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
      }
    }],
    disponivel: {
      type: Boolean,
      default: true
    }
  }],
  restricoes: [{
    tipo: {
      type: String,
      enum: ['nao_consecutivo', 'intervalo_minimo', 'sala_preferida', 'turno_preferido'],
      required: true
    },
    descricao: {
      type: String,
      required: true
    },
    valor: mongoose.Schema.Types.Mixed, // Para valores específicos da restrição
    prioridade: {
      type: Number,
      min: 1,
      max: 5,
      default: 3 // 1 = baixa, 5 = alta
    }
  }],
  cargaHorariaMaxima: {
    type: Number,
    default: 20,
    min: [1, 'Carga horária máxima deve ser maior que 0'],
    max: [40, 'Carga horária máxima deve ser menor ou igual a 40']
  },
  observacoes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Observações devem ter no máximo 1000 caracteres']
  },
  ativo: {
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
professorPreferenciaSchema.pre('save', function(next) {
  this.atualizadoEm = Date.now();
  next();
});

// Índice composto para garantir uma preferência por professor
professorPreferenciaSchema.index({ professor: 1 }, { unique: true });

module.exports = mongoose.model('ProfessorPreferencia', professorPreferenciaSchema);

