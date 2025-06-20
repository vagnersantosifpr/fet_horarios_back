require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importar rotas
const authRoutes = require('./routes/auth');
const disciplinasRoutes = require('./routes/disciplinas');
const salasRoutes = require('./routes/salas');
const preferenciasRoutes = require('./routes/preferencias');
const horariosRoutes = require('./routes/horarios');
const publicRoutes = require('./routes/public_routes');

// Importar seed
const seedDatabase = require('./seed');

const app = express();

// Middleware de segurança
app.use(helmet());

// Configurar CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://fet-horarios-front.vercel.app','http://localhost:4200']
    : ['http://localhost:4200', 'http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por janela de tempo
  message: {
    success: false,
    message: 'Muitas tentativas. Tente novamente em 15 minutos.'
  }
});
app.use('/api/', limiter);

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'horarios_db' // <--- Adicione esta linha  
})
  .then(() => {
    console.log('✅ Conectado ao MongoDB');

    // Executar seed apenas em desenvolvimento e se solicitado
    if (process.env.NODE_ENV === 'development' && process.argv.includes('--seed')) {
      seedDatabase()
        .then(() => console.log('🌱 Seed executado com sucesso'))
        .catch(err => console.error('❌ Erro no seed:', err));
    } else {
      //console.log("Falso para carga do Seed");
    }
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });

// Middleware para logging de requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/disciplinas', disciplinasRoutes);
app.use('/api/salas', salasRoutes);
app.use('/api/preferencias', preferenciasRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/public', publicRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API do Sistema de Geração de Horários',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      disciplinas: '/api/disciplinas',
      salas: '/api/salas',
      preferencias: '/api/preferencias',
      horarios: '/api/horarios',
      health: '/api/health'
    }
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Middleware global de tratamento de erros
app.use((error, req, res, next) => {
  console.error('❌ Erro não tratado:', error);

  // Erro de validação do Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors
    });
  }

  // Erro de cast do Mongoose (ID inválido)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID inválido'
    });
  }

  // Erro de duplicação (chave única)
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} já existe`
    });
  }

  // Erro genérico
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});

module.exports = app;

