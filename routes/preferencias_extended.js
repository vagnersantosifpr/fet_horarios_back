// Supondo que 'router', 'auth', 'handleValidationErrors' já estão definidos/importados
// e que 'ProfessorPreferencia' é um modelo Mongoose válido.
const express = require('express');
const router = express.Router(); // Se este fosse um arquivo novo
const { body, validationResult } = require('express-validator'); // Certifique-se que está importado
// const ProfessorPreferencia = require('../models/ProfessorPreferencia'); // Modelo Mongoose
// const { auth } = require('../middleware/auth'); // Middleware de autenticação
// const { handleValidationErrors } = require('../middleware/validationErrorHandler'); // Seu handler

const DIAS_SEMANA_VALIDOS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const TURNOS_VALIDOS = ['manha', 'tarde', 'noite'];
const HORARIO_REGEX = /^\d{2}:\d{2}$/; // Formato HH:MM

const { auth } = require('../middleware/auth'); // Ex: exports.auth = (req, res, next) => { /* lógica de auth */ };


// --- Middleware para tratar erros de validação ---
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação', // Mensagem genérica
      errors: errors.array().map(err => ({ // Mapeia para um formato mais limpo
          field: err.param || err.path, // 'param' é para versões mais antigas do express-validator
          message: err.msg
      }))
    });
  }
  next();
};


// Obter minhas preferências (disciplinas e horários) - versão simplificada
router.get('/minhas-preferencias', auth, async (req, res) => {
  try {
    const preferencia = await ProfessorPreferencia.findOne({ professor: req.user._id })
      .populate('disciplinas.disciplina', 'codigo nome cargaHoraria') // Popula a disciplina dentro do array
      .populate('professor', 'nome email'); // Popula o campo professor do documento principal

    if (!preferencia) {
      // Retorna uma estrutura padrão se não houver preferências salvas
      return res.json({
        success: true,
        data: {
          disciplinas: [],
          disponibilidadeHorarios: [],
          restricoes: [],
          cargaHorariaMaxima: 20, // Um default razoável
          observacoes: ''
        }
      });
    }

    res.json({
      success: true,
      data: {
        // Garante que arrays vazios sejam retornados em vez de undefined, se não existirem no doc
        disciplinas: preferencia.disciplinas || [],
        disponibilidadeHorarios: preferencia.disponibilidadeHorarios || [],
        restricoes: preferencia.restricoes || [],
        cargaHorariaMaxima: preferencia.cargaHorariaMaxima || 20,
        observacoes: preferencia.observacoes || ''
      }
    });
  } catch (error) {
    console.error('Erro ao obter minhas preferências:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar preferências.'
    });
  }
});

// Salvar minhas preferências (disciplinas e horários) - versão simplificada
router.post('/minhas-preferencias', auth, [
  // Validação para 'disciplinas'
  body('disciplinas')
    .optional()
    .isArray({ min: 0 }) // Pode ser um array vazio para remover todas
    .withMessage('Preferências de disciplinas devem ser um array.'),
  body('disciplinas.*.disciplina') // Valida cada 'disciplina' dentro do array 'disciplinas'
    .if(body('disciplinas').exists({ checkFalsy: false })) // Só valida se 'disciplinas' foi enviado
    .isMongoId()
    .withMessage('ID de disciplina inválido na lista de preferências.'),
  body('disciplinas.*.nivelPrioridade')
    .if(body('disciplinas').exists({ checkFalsy: false }))
    .optional({ checkFalsy: true }) // Permite ser nulo ou não enviado
    .isInt({ min: 1, max: 5 })
    .withMessage('Nível de prioridade da disciplina deve ser um número entre 1 e 5.'),

  // Validação para 'disponibilidadeHorarios' e 'restricoes' (estrutura similar)
  body(['disponibilidadeHorarios', 'restricoes']) // Aplica as mesmas validações para ambos
    .optional()
    .isArray({ min: 0 })
    .withMessage('Disponibilidade/Restrições de horários devem ser um array.'),
  body(['disponibilidadeHorarios.*.diaSemana', 'restricoes.*.diaSemana'])
    .if((value, { path }) => body(path.startsWith('disponibilidadeHorarios') ? 'disponibilidadeHorarios' : 'restricoes').exists({ checkFalsy: false }))
    .isIn(DIAS_SEMANA_VALIDOS)
    .withMessage(`Dia da semana inválido. Valores permitidos: ${DIAS_SEMANA_VALIDOS.join(', ')}.`),
  body(['disponibilidadeHorarios.*.turno', 'restricoes.*.turno'])
    .if((value, { path }) => body(path.startsWith('disponibilidadeHorarios') ? 'disponibilidadeHorarios' : 'restricoes').exists({ checkFalsy: false }))
    .isIn(TURNOS_VALIDOS)
    .withMessage(`Turno inválido. Valores permitidos: ${TURNOS_VALIDOS.join(', ')}.`),
  body(['disponibilidadeHorarios.*.horarios', 'restricoes.*.horarios'])
    .if((value, { path }) => body(path.startsWith('disponibilidadeHorarios') ? 'disponibilidadeHorarios' : 'restricoes').exists({ checkFalsy: false }))
    .optional() // O array de horários específicos pode ser opcional dentro de uma disponibilidade/restrição
    .isArray()
    .withMessage('A lista de horários específicos deve ser um array.'),
  body(['disponibilidadeHorarios.*.horarios.*.inicio', 'restricoes.*.horarios.*.inicio'])
    .if((value, { path }) => {
        const parentPath = path.substring(0, path.lastIndexOf('.')); // e.g., disponibilidadeHorarios[0].horarios
        return body(parentPath).exists({ checkFalsy: false });
    })
    .matches(HORARIO_REGEX)
    .withMessage('Horário de início inválido. Use o formato HH:MM.'),
  body(['disponibilidadeHorarios.*.horarios.*.fim', 'restricoes.*.horarios.*.fim'])
    .if((value, { path }) => {
        const parentPath = path.substring(0, path.lastIndexOf('.'));
        return body(parentPath).exists({ checkFalsy: false });
    })
    .matches(HORARIO_REGEX)
    .withMessage('Horário de fim inválido. Use o formato HH:MM.')
    .custom((value, { req, path }) => {
        // Encontra o 'inicio' correspondente para validação
        const basePath = path.substring(0, path.lastIndexOf('.')); // e.g. disponibilidadeHorarios[0].horarios[0]
        const inicioValue = req.body[basePath.split('[')[0]][parseInt(basePath.match(/\[(\d+)\]/g)[0].replace(/\D/g,''))]
                            ?.horarios?.[parseInt(basePath.match(/\[(\d+)\]/g)[1].replace(/\D/g,''))]?.inicio;
        if (inicioValue && value <= inicioValue) {
          throw new Error('Horário de fim deve ser posterior ao horário de início.');
        }
        return true;
    }),


  body('cargaHorariaMaxima')
    .optional()
    .isInt({ min: 1, max: 40 }) // Max 40 é um exemplo, ajuste conforme necessário
    .withMessage('Carga horária máxima deve ser um número inteiro entre 1 e 40.'),
  body('observacoes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Observações não podem exceder 1000 caracteres.')
], handleValidationErrors, async (req, res) => {
  try {
    // Os valores que não foram enviados no req.body serão undefined.
    // O Mongoose usará os defaults do schema ou manterá os valores existentes
    // se um campo não for fornecido no objeto de atualização.
    const { disciplinas, disponibilidadeHorarios, restricoes, cargaHorariaMaxima, observacoes } = req.body;

    const dadosParaAtualizar = {};
    if (disciplinas !== undefined) dadosParaAtualizar.disciplinas = disciplinas;
    if (disponibilidadeHorarios !== undefined) dadosParaAtualizar.disponibilidadeHorarios = disponibilidadeHorarios;
    if (restricoes !== undefined) dadosParaAtualizar.restricoes = restricoes;
    if (cargaHorariaMaxima !== undefined) dadosParaAtualizar.cargaHorariaMaxima = cargaHorariaMaxima;
    if (observacoes !== undefined) dadosParaAtualizar.observacoes = observacoes;

    // Adiciona o professor para a query e para o caso de upsert
    dadosParaAtualizar.professor = req.user._id;

    const preferencia = await ProfessorPreferencia.findOneAndUpdate(
      { professor: req.user._id }, // Condição para encontrar
      { $set: dadosParaAtualizar }, // Usa $set para atualizar apenas os campos fornecidos
      {
        new: true,          // Retorna o documento modificado
        upsert: true,       // Cria o documento se não existir
        runValidators: true, // Roda as validações do schema Mongoose
        setDefaultsOnInsert: true // Aplica defaults do schema no insert (se upsert criar)
      }
    ).populate('disciplinas.disciplina', 'codigo nome cargaHoraria');

    res.json({
      success: true,
      message: 'Preferências salvas com sucesso!',
      data: {
        disciplinas: preferencia.disciplinas || [],
        disponibilidadeHorarios: preferencia.disponibilidadeHorarios || [],
        restricoes: preferencia.restricoes || [],
        cargaHorariaMaxima: preferencia.cargaHorariaMaxima, // Já terá default do schema ou valor salvo
        observacoes: preferencia.observacoes || ''
      }
    });
  } catch (error) {
    console.error('Erro ao salvar minhas preferências:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Erro de validação nos dados das preferências.',
            errors: error.errors // Pode ser útil para o frontend
        });
    }
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao salvar preferências.'
    });
  }
});

module.exports = router; // Se este for um arquivo de rotas separado