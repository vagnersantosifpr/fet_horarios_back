const express = require('express');
const { body, validationResult } = require('express-validator');

// --- Dependências de Modelos (certifique-se que estes caminhos e arquivos existem) ---
const HorarioGerado = require('../models/HorarioGerado'); // Ex: const HorarioGerado = mongoose.model('HorarioGerado', horarioGeradoSchema);
const ProfessorPreferencia = require('../models/ProfessorPreferencia'); // Ex: const ProfessorPreferencia = mongoose.model('ProfessorPreferencia', professorPreferenciaSchema);
// Assumindo que você também tem modelos para Disciplina e Sala se for populá-los profundamente além do ID.
// const Disciplina = require('../models/Disciplina');
// const Sala = require('../models/Sala');

// --- Middleware de Autenticação (certifique-se que este caminho e arquivo existem) ---
const { auth } = require('../middleware/auth'); // Ex: exports.auth = (req, res, next) => { /* lógica de auth */ };

const router = express.Router();

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


// Obter meus horários - versão simplificada
router.get('/meus-horarios', auth, async (req, res) => {
  try {
    const { semestre } = req.query;

    const query = {
      professor: req.user._id, // Vem do middleware 'auth'
      // status: 'concluido' // Removido para simplificar ou adicione de volta se necessário
    };

    if (semestre) {
      query.semestre = semestre;
    }

    const horarios = await HorarioGerado.find(query)
      // Ajuste os 'populate' conforme a estrutura do seu modelo HorarioGerado
      // e os campos que você deseja em Disciplina e Sala.
      .populate({
        path: 'horarios.disciplina', // Supondo que 'horarios' é um array de objetos, e cada objeto tem 'disciplina'
        select: 'codigo nome cargaHoraria'
      })
      .populate({
        path: 'horarios.sala', // Supondo que 'horarios' é um array de objetos, e cada objeto tem 'sala'
        select: 'codigo nome'
      })
      .sort({ criadoEm: -1 });
      // .limit(10); // Removido para simplificar ou adicione de volta se necessário

    // Formatar os dados para exibição em grade de horários
    const horariosFormatados = horarios.map(horarioDoc => {
      const horario = horarioDoc.toObject(); // Converte Mongoose document para plain JS object
      return {
        _id: horario._id, // Use _id para consistência, ou 'id' se preferir
        titulo: horario.titulo,
        semestre: horario.semestre,
        fitnessScore: horario.fitnessScore,
        criadoEm: horario.criadoEm,
        status: horario.status, // Adicionado status
        // A função formatarGradeHorarios espera um array de 'horarioItem'
        // Certifique-se de que horario.horarios (ou o campo correto) contém essa lista
        grade: formatarGradeHorarios(horario.horarios || []) // Garante que é um array
      };
    });

    res.json({
      success: true,
      data: {
        horarios: horariosFormatados
      }
    });
  } catch (error) {
    console.error('Erro ao obter meus horários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao obter meus horários.'
    });
  }
});


// Gerar horário individual
router.post('/gerar-individual', auth, [
  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('Título é obrigatório'),
  body('semestre')
    .matches(/^\d{4}\.[1-2]$/)
    .withMessage('Formato de semestre inválido (YYYY.1 ou YYYY.2)'),
  body('usarPreferencias')
    .optional()
    .isBoolean()
    .withMessage('usarPreferencias deve ser um boolean'),
  // Adicione validações para parâmetros do algoritmo se eles puderem ser enviados pelo cliente
  body('parametros.populacao').optional().isInt({ min: 10 }).withMessage('População inválida'),
  body('parametros.geracoes').optional().isInt({ min: 10 }).withMessage('Gerações inválidas'),
  body('parametros.taxaMutacao').optional().isFloat({ min: 0.01, max: 1 }).withMessage('Taxa de mutação inválida'),
  body('parametros.tipoCruzamento').optional().isInt({ min: 0, max: 2 }).withMessage('Tipo de cruzamento inválido'),
], handleValidationErrors, async (req, res) => {
  try {
    const { titulo, semestre, usarPreferencias = true, observacoes, parametros } = req.body;

    if (usarPreferencias) {
      const preferencias = await ProfessorPreferencia.findOne({ professor: req.user._id });
      if (!preferencias || !preferencias.disciplinas || preferencias.disciplinas.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'É necessário configurar suas preferências (incluindo disciplinas) antes de gerar um horário usando-as.'
        });
      }
    }

    const horario = new HorarioGerado({
      titulo,
      professor: req.user._id,
      semestre,
      // Usar parâmetros do request ou defaults
      parametrosAlgoritmo: {
        populacao: parametros?.populacao || 50,
        geracoes: parametros?.geracoes || 100,
        taxaMutacao: parametros?.taxaMutacao || 0.1,
        tipoCruzamento: parametros?.tipoCruzamento || 1 // 0: Ponto Único, 1: Dois Pontos, 2: Uniforme
      },
      observacoes,
      status: 'PENDENTE' // Status inicial antes de ir para a fila de processamento
    });

    await horario.save();

    // Em um sistema real, você adicionaria isso a uma fila (RabbitMQ, BullMQ, Kafka)
    // para processamento assíncrono por um worker separado.
    // O setTimeout simula esse processamento.
    // NÃO USE setTimeout para tarefas longas em produção em um único processo Node.js.
    // Isso bloqueará o event loop para outras requisições.
    processarGeracaoHorario(horario._id, 'individual', usarPreferencias); // Função para processamento em background

    res.status(202).json({ // 202 Accepted indica que a requisição foi aceita para processamento
      success: true,
      message: 'Geração de horário individual solicitada e está sendo processada.',
      data: {
        horario: {
          _id: horario._id,
          titulo: horario.titulo,
          semestre: horario.semestre,
          status: horario.status,
          criadoEm: horario.criadoEm
        }
      }
    });
  } catch (error) {
    console.error('Erro ao iniciar geração de horário individual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao iniciar geração de horário individual.'
    });
  }
});

// Rota para gerar horário coletivo (funcionalidade de administração)
router.post('/gerar-coletivo', auth, [
  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('Título é obrigatório'),
  body('semestre')
    .matches(/^\d{4}\.[1-2]$/)
    .withMessage('Formato de semestre inválido (YYYY.1 ou YYYY.2)'),
  body('professores')
    .isArray({ min: 1 })
    .withMessage('Lista de IDs de professores é obrigatória e deve ter ao menos um professor.'),
  body('professores.*') // Valida cada item do array
    .isMongoId()
    .withMessage('Um ou mais IDs de professor são inválidos.'),
  // Validações para os parâmetros do algoritmo, se enviados
  body('parametros.populacao').optional().isInt({ min: 10 }).withMessage('População inválida para geração coletiva.'),
  body('parametros.geracoes').optional().isInt({ min: 10 }).withMessage('Gerações inválidas para geração coletiva.'),
  body('parametros.taxaMutacao').optional().isFloat({ min: 0.01, max: 1 }).withMessage('Taxa de mutação inválida para geração coletiva.'),
  body('parametros.tipoCruzamento').optional().isInt({ min: 0, max: 2 }).withMessage('Tipo de cruzamento inválido para geração coletiva.'),
  body('parametros.otimizacao')
    .optional()
    .isIn(['equilibrio', 'preferencias', 'recursos'])
    .withMessage('Tipo de otimização inválido (equilibrio, preferencias, recursos).')
], handleValidationErrors, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem gerar horários coletivos.'
      });
    }

    const { titulo, semestre, professores, parametros = {}, observacoes } = req.body;

    // Criar um "job" de geração coletiva
    const horarioColetivoJob = new HorarioGerado({ // Ou um modelo específico para Jobs Coletivos
        titulo,
        semestre,
        tipoGeracao: 'coletiva', // Adicionar um campo para diferenciar
        professoresEnvolvidos: professores, // Armazenar IDs dos professores
        parametrosAlgoritmo: {
            populacao: parametros.populacao || 100,
            geracoes: parametros.geracoes || 200,
            taxaMutacao: parametros.taxaMutacao || 0.05,
            tipoCruzamento: parametros.tipoCruzamento !== undefined ? parametros.tipoCruzamento : 2,
            otimizacao: parametros.otimizacao || 'equilibrio'
        },
        observacoes,
        status: 'PENDENTE', // Status inicial do job coletivo
        // userAdmin: req.user._id // Quem solicitou
    });

    await horarioColetivoJob.save();

    // Adicionar à fila de processamento (simulado aqui)
    processarGeracaoHorario(horarioColetivoJob._id, 'coletiva', true, parametros);

    res.status(202).json({
      success: true,
      message: 'Geração de horários coletivos solicitada e está sendo processada.',
      data: {
        jobId: horarioColetivoJob._id,
        titulo: horarioColetivoJob.titulo,
        status: horarioColetivoJob.status,
        professoresAfetados: professores.length
      }
    });

  } catch (error) {
    console.error('Erro ao iniciar geração de horários coletivos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao iniciar geração de horários coletivos.'
    });
  }
});

// --- FUNÇÃO DE PROCESSAMENTO ASSÍNCRONO (SIMULADA) ---
// Em um sistema real, esta lógica estaria em um worker separado ou usaria
// child_process para não bloquear o event loop principal.
// Este é um GRANDE SIMPLIFICADOR. A geração real seria complexa.
async function processarGeracaoHorario(idHorarioOuJob, tipo, usarPreferencias, parametrosColetivos = {}) {
  console.log(`[PROCESSAMENTO ${tipo.toUpperCase()}] Iniciando para ID: ${idHorarioOuJob}`);
  let tempoSimulacao = tipo === 'individual' ? 15000 : 30000; // 15s para individual, 30s para coletivo

  try {
    // Simula o tempo de processamento
    await new Promise(resolve => setTimeout(resolve, tempoSimulacao));

    if (tipo === 'individual') {
      const horario = await HorarioGerado.findById(idHorarioOuJob);
      if (!horario) {
        console.error(`[PROCESSAMENTO INDIVIDUAL] Horário ${idHorarioOuJob} não encontrado.`);
        return;
      }

      horario.status = 'PROCESSANDO';
      await horario.save();

      let preferencias = null;
      if (usarPreferencias && horario.professor) {
          preferencias = await ProfessorPreferencia.findOne({ professor: horario.professor });
      }

      const horariosGeradosItens = await simularGeracaoHorarioIndividual(preferencias, horario.parametrosAlgoritmo);

      horario.horarios = horariosGeradosItens; // Array de HorarioItem
      horario.status = 'CONCLUIDO';
      horario.fitnessScore = Math.floor(Math.random() * 30) + 70;
      horario.tempoExecucao = `${(tempoSimulacao / 1000).toFixed(0)}s`;
      await horario.save();
      console.log(`[PROCESSAMENTO INDIVIDUAL] Horário ${idHorarioOuJob} concluído.`);

    } else if (tipo === 'coletiva') {
      const jobColetivo = await HorarioGerado.findById(idHorarioOuJob); // Ou modelo de Job
      if (!jobColetivo) {
        console.error(`[PROCESSAMENTO COLETIVO] Job ${idHorarioOuJob} não encontrado.`);
        return;
      }

      jobColetivo.status = 'PROCESSANDO';
      await jobColetivo.save();

      // Para cada professor no job, gerar um HorarioGerado individual
      const subHorariosGerados = [];
      for (const professorId of jobColetivo.professoresEnvolvidos) {
        const preferenciasProfessor = await ProfessorPreferencia.findOne({ professor: professorId });
        // Aqui você poderia criar um HorarioGerado individual para cada professor
        // vinculado a este job coletivo. Por simplicidade, vamos apenas simular
        // que o job principal é atualizado.
        // const horariosItens = await simularGeracaoHorarioColetivo(preferenciasProfessor, parametrosColetivos.otimizacao, jobColetivo.parametrosAlgoritmo);

        // Exemplo: Criar um HorarioGerado para cada professor
         const horarioIndividual = new HorarioGerado({
            titulo: `${jobColetivo.titulo} - Prof. ${professorId.toString().slice(-4)}`,
            semestre: jobColetivo.semestre,
            professor: professorId,
            jobColetivoPai: jobColetivo._id, // Link para o job pai
            parametrosAlgoritmo: jobColetivo.parametrosAlgoritmo,
            horarios: await simularGeracaoHorarioColetivo(preferenciasProfessor, parametrosColetivos.otimizacao, jobColetivo.parametrosAlgoritmo),
            status: 'CONCLUIDO',
            fitnessScore: Math.floor(Math.random() * 25) + 75,
            tempoExecucao: `${(Math.random() * 5 + 5).toFixed(0)}s` // Tempo menor por sub-job
        });
        await horarioIndividual.save();
        subHorariosGerados.push(horarioIndividual._id);
      }

      jobColetivo.subTarefas = subHorariosGerados; // IDs dos horários individuais gerados
      jobColetivo.status = 'CONCLUIDO';
      jobColetivo.fitnessScore = Math.floor(Math.random() * 20) + 80; // Média ou score geral
      jobColetivo.tempoExecucao = `${(tempoSimulacao / 1000).toFixed(0)}s`;
      await jobColetivo.save();
      console.log(`[PROCESSAMENTO COLETIVO] Job ${idHorarioOuJob} concluído. ${subHorariosGerados.length} horários individuais gerados.`);
    }

  } catch (error) {
    console.error(`[PROCESSAMENTO ${tipo.toUpperCase()}] Erro para ID ${idHorarioOuJob}:`, error);
    try {
      // Tenta marcar como erro
      const docParaAtualizar = await HorarioGerado.findById(idHorarioOuJob);
      if (docParaAtualizar) {
        docParaAtualizar.status = 'ERRO';
        docParaAtualizar.observacoes = `${docParaAtualizar.observacoes || ''}\nErro durante processamento: ${error.message}`;
        await docParaAtualizar.save();
      }
    } catch (saveError) {
      console.error(`[PROCESSAMENTO ${tipo.toUpperCase()}] Erro ao salvar status de erro para ID ${idHorarioOuJob}:`, saveError);
    }
  }
}


// --- Funções auxiliares de simulação e formatação ---

function formatarGradeHorarios(horariosItens) { // Renomeado para clareza
  const grade = {
    segunda: [], terca: [], quarta: [], quinta: [], sexta: [], sabado: []
  };

  // Garante que horariosItens é um array e não nulo/undefined
  if (!Array.isArray(horariosItens)) {
      console.warn('formatarGradeHorarios recebeu entrada inválida:', horariosItens);
      return grade; // Retorna grade vazia
  }

  horariosItens.forEach(item => {
    // Verifica se item e item.diaSemana existem e se grade[item.diaSemana] é um array
    if (item && item.diaSemana && Array.isArray(grade[item.diaSemana.toLowerCase()])) {
      grade[item.diaSemana.toLowerCase()].push({
        // Certifique-se que o objeto populado (ou os IDs) estão corretos aqui
        disciplina: item.disciplina, // Pode ser um objeto populado ou apenas o ID
        sala: item.sala,           // Pode ser um objeto populado ou apenas o ID
        horarioInicio: item.horarioInicio,
        horarioFim: item.horarioFim,
        turno: item.turno
      });
    } else {
        // console.warn('Item de horário inválido ou dia da semana desconhecido:', item);
    }
  });

  Object.keys(grade).forEach(dia => {
    if (Array.isArray(grade[dia])) {
        grade[dia].sort((a, b) => (a.horarioInicio || '').localeCompare(b.horarioInicio || ''));
    }
  });

  return grade;
}

// Simula a geração dos itens de horário para um professor
async function simularGeracaoHorarioIndividual(preferencias, parametrosAlgoritmo) {
  const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const horarios = []; // Array de HorarioItem

  // Simular busca de disciplinas e salas disponíveis (IDs)
  // Em um sistema real, você buscaria do banco de dados ou teria acesso a elas
  const disciplinasDisponiveisIds = preferencias?.disciplinas?.map(d => d.disciplina) || []; // Supondo que preferencias.disciplinas é [{disciplina: ObjectId('...')}, ...]
  const salasDisponiveisIds = ['salaId1', 'salaId2', 'salaId3']; // Exemplo de IDs de salas

  if (disciplinasDisponiveisIds.length === 0) {
    return horarios;
  }

  // Número de aulas a gerar, ex: 5 ou baseado na carga horária total
  const numAulas = Math.min(disciplinasDisponiveisIds.length, 5);

  for (let i = 0; i < numAulas; i++) {
    const disciplinaId = disciplinasDisponiveisIds[i % disciplinasDisponiveisIds.length]; // Pega uma disciplina
    let diaEscolhido, turnoEscolhido, horarioInicio, horarioFim;

    // Tentar usar disponibilidade de preferências
    if (preferencias?.disponibilidadeHorarios?.length > 0) {
      const disp = preferencias.disponibilidadeHorarios[Math.floor(Math.random() * preferencias.disponibilidadeHorarios.length)];
      diaEscolhido = disp.diaSemana;
      turnoEscolhido = disp.turno;
      if (disp.horarios?.length > 0) {
        horarioInicio = disp.horarios[0].inicio;
        horarioFim = disp.horarios[0].fim;
      }
    }

    // Fallbacks
    diaEscolhido = diaEscolhido || diasSemana[Math.floor(Math.random() * diasSemana.length)];
    turnoEscolhido = turnoEscolhido || ['manha', 'tarde', 'noite'][Math.floor(Math.random() * 3)];
    if (!horarioInicio || !horarioFim) {
      switch (turnoEscolhido) {
        case 'manha': horarioInicio = '08:00'; horarioFim = '10:00'; break;
        case 'tarde': horarioInicio = '14:00'; horarioFim = '16:00'; break;
        default:      horarioInicio = '19:00'; horarioFim = '21:00'; break;
      }
    }
    const salaId = salasDisponiveisIds[Math.floor(Math.random() * salasDisponiveisIds.length)];

    horarios.push({
      disciplina: disciplinaId, // Referência ao ID da disciplina
      sala: salaId,            // Referência ao ID da sala
      diaSemana: diaEscolhido,
      horarioInicio,
      horarioFim,
      turno: turnoEscolhido
    });
  }
  return horarios;
}

// Simula a geração para cenário coletivo, aplicando otimizações
async function simularGeracaoHorarioColetivo(preferencias, tipoOtimizacao, parametrosAlgoritmo) {
  const horarios = await simularGeracaoHorarioIndividual(preferencias, parametrosAlgoritmo);

  if (tipoOtimizacao === 'recursos') {
    horarios.forEach(h => h.observacaoSimulada = 'Otimizado para recursos (coletivo)');
  } else if (tipoOtimizacao === 'preferencias') {
    horarios.forEach(h => h.observacaoSimulada = 'Otimizado para preferências (coletivo)');
  }
  return horarios;
}

// --- Exportar o router ---
module.exports = router;