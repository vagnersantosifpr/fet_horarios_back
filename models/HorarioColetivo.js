const mongoose = require('mongoose');

const horarioColetivoGeradoSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true
  },
  administrador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Administrador é obrigatório']
  },
  semestre: {
    type: String,
    required: [true, 'Semestre é obrigatório'],
    match: [/^\d{4}\.[1-2]$/, 'Formato de semestre inválido (YYYY.1 ou YYYY.2)']
  },
  professores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  disciplinas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Disciplina',
    required: true
  }],
  salas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sala',
    required: true
  }],
  parametrosAlgoritmo: {
    populacao: {
      type: Number,
      default: 100,
      min: [20, 'População deve ser maior ou igual a 20']
    },
    geracoes: {
      type: Number,
      default: 200,
      min: [50, 'Gerações devem ser maior ou igual a 50']
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
    },
    pesoPreferencias: {
      type: Number,
      default: 0.3,
      min: [0, 'Peso das preferências deve ser maior ou igual a 0'],
      max: [1, 'Peso das preferências deve ser menor ou igual a 1']
    },
    pesoConflitos: {
      type: Number,
      default: 0.7,
      min: [0, 'Peso dos conflitos deve ser maior ou igual a 0'],
      max: [1, 'Peso dos conflitos deve ser menor ou igual a 1']
    }
  },
  restricoesGlobais: [{
    tipo: {
      type: String,
      enum: ['intervalo_almoco', 'carga_maxima_diaria', 'disciplinas_consecutivas', 'uso_sala'],
      required: true
    },
    descricao: {
      type: String,
      required: true,
      trim: true
    },
    valor: mongoose.Schema.Types.Mixed, // Pode ser string, number, object, etc.
    prioridade: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  }],
  horariosGerados: [{
    professor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
    }]
  }],
  conflitosDetectados: [{
    tipo: {
      type: String,
      enum: ['conflito_sala', 'conflito_professor', 'violacao_preferencia', 'violacao_restricao'],
      required: true
    },
    descricao: {
      type: String,
      required: true
    },
    professoresEnvolvidos: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    disciplinasEnvolvidas: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Disciplina'
    }],
    salasEnvolvidas: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sala'
    }],
    severidade: {
      type: String,
      enum: ['baixa', 'media', 'alta', 'critica'],
      default: 'media'
    }
  }],
  estatisticas: {
    totalProfessores: {
      type: Number,
      default: 0
    },
    totalDisciplinas: {
      type: Number,
      default: 0
    },
    totalSalas: {
      type: Number,
      default: 0
    },
    totalHorarios: {
      type: Number,
      default: 0
    },
    percentualPreferenciasAtendidas: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    percentualConflitos: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
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
    maxlength: [2000, 'Observações devem ter no máximo 2000 caracteres']
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
horarioColetivoGeradoSchema.pre('save', function(next) {
  this.atualizadoEm = Date.now();
  next();
});

// Middleware para calcular estatísticas antes de salvar
horarioColetivoGeradoSchema.pre('save', function(next) {
  if (this.horariosGerados && this.horariosGerados.length > 0) {
    this.estatisticas.totalProfessores = this.professores.length;
    this.estatisticas.totalDisciplinas = this.disciplinas.length;
    this.estatisticas.totalSalas = this.salas.length;
    
    // Calcular total de horários
    this.estatisticas.totalHorarios = this.horariosGerados.reduce((total, prof) => {
      return total + prof.horarios.length;
    }, 0);
    
    // Calcular percentual de conflitos
    if (this.conflitosDetectados && this.conflitosDetectados.length > 0) {
      this.estatisticas.percentualConflitos = Math.min(100, 
        (this.conflitosDetectados.length / this.estatisticas.totalHorarios) * 100
      );
    }
  }
  next();
});

module.exports = mongoose.model('HorarioColetivoGerado', horarioColetivoGeradoSchema);

