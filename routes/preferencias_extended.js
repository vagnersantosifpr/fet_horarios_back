// Novas rotas para funcionalidades solicitadas

// 1. Rota para obter preferências do usuário (já existe como /my-preferences)
// Vamos adicionar uma rota mais específica para as funcionalidades solicitadas

// Obter minhas preferências (disciplinas e horários) - versão simplificada
router.get('/minhas-preferencias', auth, async (req, res) => {
  try {
    const preferencia = await ProfessorPreferencia.findOne({ professor: req.user._id })
      .populate('disciplinas.disciplina', 'codigo nome cargaHoraria')
      .populate('professor', 'nome email');

    if (!preferencia) {
      return res.json({
        success: true,
        data: {
          disciplinas: [],
          disponibilidadeHorarios: [],
          restricoes: [],
          cargaHorariaMaxima: 20
        }
      });
    }

    res.json({
      success: true,
      data: {
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
      message: 'Erro interno do servidor'
    });
  }
});

// Salvar minhas preferências (disciplinas e horários) - versão simplificada
router.post('/minhas-preferencias', auth, [
  body('disciplinas')
    .optional()
    .isArray()
    .withMessage('Disciplinas devem ser um array'),
  body('disponibilidadeHorarios')
    .optional()
    .isArray()
    .withMessage('Disponibilidade de horários deve ser um array'),
  body('cargaHorariaMaxima')
    .optional()
    .isInt({ min: 1, max: 40 })
    .withMessage('Carga horária máxima deve ser entre 1 e 40')
], handleValidationErrors, async (req, res) => {
  try {
    const { disciplinas, disponibilidadeHorarios, restricoes, cargaHorariaMaxima, observacoes } = req.body;

    const dadosPreferencia = {
      professor: req.user._id,
      disciplinas: disciplinas || [],
      disponibilidadeHorarios: disponibilidadeHorarios || [],
      restricoes: restricoes || [],
      cargaHorariaMaxima: cargaHorariaMaxima || 20,
      observacoes: observacoes || ''
    };

    const preferencia = await ProfessorPreferencia.findOneAndUpdate(
      { professor: req.user._id },
      dadosPreferencia,
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    ).populate('disciplinas.disciplina', 'codigo nome cargaHoraria');

    res.json({
      success: true,
      message: 'Preferências salvas com sucesso',
      data: {
        disciplinas: preferencia.disciplinas || [],
        disponibilidadeHorarios: preferencia.disponibilidadeHorarios || [],
        restricoes: preferencia.restricoes || [],
        cargaHorariaMaxima: preferencia.cargaHorariaMaxima || 20,
        observacoes: preferencia.observacoes || ''
      }
    });
  } catch (error) {
    console.error('Erro ao salvar minhas preferências:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

