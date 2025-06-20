const mongoose = require('mongoose');
const User = require('./models/User');
const Disciplina = require('./models/Disciplina');
const Sala = require('./models/Sala');
const ProfessorPreferencia = require('./models/ProfessorPreferencia');

const seedDatabase = async () => {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Limpar dados existentes
    await User.deleteMany({});
    await Disciplina.deleteMany({});
    await Sala.deleteMany({});
    await ProfessorPreferencia.deleteMany({});

    // Criar usuário administrador
    const admin = new User({
      nome: 'Administrador do Sistema',
      email: 'admin@universidade.edu.br',
      senha: 'admin123',
      tipo: 'admin',
      departamento: 'TI'
    });
    await admin.save();

    // Criar professores de exemplo
    const professores = [
      {
        nome: 'Dr. João Silva',
        email: 'joao.silva@universidade.edu.br',
        senha: 'professor123',
        departamento: 'Ciência da Computação',
        telefone: '(83) 99999-1111'
      },
      {
        nome: 'Dra. Maria Santos',
        email: 'maria.santos@universidade.edu.br',
        senha: 'professor123',
        departamento: 'Matemática',
        telefone: '(83) 99999-2222'
      },
      {
        nome: 'Dr. Pedro Oliveira',
        email: 'pedro.oliveira@universidade.edu.br',
        senha: 'professor123',
        departamento: 'Física',
        telefone: '(83) 99999-3333'
      }
    ];

    const professoresCriados = [];
    for (const professorData of professores) {
      const professor = new User(professorData);
      await professor.save();
      professoresCriados.push(professor);
    }

    // Criar disciplinas
    const disciplinas = [
      {
        codigo: 'CC001',
        nome: 'Algoritmos e Estruturas de Dados',
        cargaHoraria: 60,
        creditos: 4,
        departamento: 'Ciência da Computação',
        periodo: 2
      },
      {
        codigo: 'CC002',
        nome: 'Programação Orientada a Objetos',
        cargaHoraria: 60,
        creditos: 4,
        departamento: 'Ciência da Computação',
        periodo: 3
      },
      {
        codigo: 'CC003',
        nome: 'Banco de Dados',
        cargaHoraria: 60,
        creditos: 4,
        departamento: 'Ciência da Computação',
        periodo: 4
      },
      {
        codigo: 'MAT001',
        nome: 'Cálculo Diferencial e Integral I',
        cargaHoraria: 90,
        creditos: 6,
        departamento: 'Matemática',
        periodo: 1
      },
      {
        codigo: 'MAT002',
        nome: 'Álgebra Linear',
        cargaHoraria: 60,
        creditos: 4,
        departamento: 'Matemática',
        periodo: 2
      },
      {
        codigo: 'FIS001',
        nome: 'Física Geral I',
        cargaHoraria: 90,
        creditos: 6,
        departamento: 'Física',
        periodo: 1
      },
      {
        codigo: 'FIS002',
        nome: 'Física Experimental I',
        cargaHoraria: 30,
        creditos: 2,
        departamento: 'Física',
        periodo: 1
      }
    ];

    const disciplinasCriadas = [];
    for (const disciplinaData of disciplinas) {
      const disciplina = new Disciplina(disciplinaData);
      await disciplina.save();
      disciplinasCriadas.push(disciplina);
    }

    // Criar salas
    const salas = [
      {
        codigo: 'LAB01',
        nome: 'Laboratório de Informática 1',
        capacidade: 30,
        tipo: 'laboratorio',
        bloco: 'A',
        andar: 1,
        recursos: ['projetor', 'ar_condicionado', 'computadores']
      },
      {
        codigo: 'LAB02',
        nome: 'Laboratório de Informática 2',
        capacidade: 25,
        tipo: 'laboratorio',
        bloco: 'A',
        andar: 1,
        recursos: ['projetor', 'computadores']
      },
      {
        codigo: 'SALA101',
        nome: 'Sala de Aula 101',
        capacidade: 40,
        tipo: 'sala_aula',
        bloco: 'B',
        andar: 1,
        recursos: ['projetor', 'ar_condicionado']
      },
      {
        codigo: 'SALA102',
        nome: 'Sala de Aula 102',
        capacidade: 35,
        tipo: 'sala_aula',
        bloco: 'B',
        andar: 1,
        recursos: ['projetor']
      },
      {
        codigo: 'SALA201',
        nome: 'Sala de Aula 201',
        capacidade: 50,
        tipo: 'sala_aula',
        bloco: 'B',
        andar: 2,
        recursos: ['projetor', 'ar_condicionado', 'som']
      },
      {
        codigo: 'AUD01',
        nome: 'Auditório Principal',
        capacidade: 100,
        tipo: 'auditorio',
        bloco: 'C',
        andar: 0,
        recursos: ['projetor', 'ar_condicionado', 'som', 'microfone']
      },
      {
        codigo: 'LABFIS01',
        nome: 'Laboratório de Física 1',
        capacidade: 20,
        tipo: 'laboratorio',
        bloco: 'D',
        andar: 1,
        recursos: ['ar_condicionado']
      }
    ];

    const salasCriadas = [];
    for (const salaData of salas) {
      const sala = new Sala(salaData);
      await sala.save();
      salasCriadas.push(sala);
    }

    // Criar preferências para os professores
    const preferenciasData = [
      {
        professor: professoresCriados[0]._id, // Dr. João Silva
        disciplinas: [
          { disciplina: disciplinasCriadas[0]._id, preferencia: 5 }, // Algoritmos
          { disciplina: disciplinasCriadas[1]._id, preferencia: 4 }, // POO
          { disciplina: disciplinasCriadas[2]._id, preferencia: 5 }  // Banco de Dados
        ],
        disponibilidadeHorarios: [
          {
            diaSemana: 'segunda',
            turno: 'manha',
            horarios: [{ inicio: '08:00', fim: '12:00' }],
            disponivel: true
          },
          {
            diaSemana: 'terca',
            turno: 'tarde',
            horarios: [{ inicio: '14:00', fim: '18:00' }],
            disponivel: true
          },
          {
            diaSemana: 'quarta',
            turno: 'manha',
            horarios: [{ inicio: '08:00', fim: '12:00' }],
            disponivel: true
          }
        ],
        restricoes: [
          {
            tipo: 'nao_consecutivo',
            descricao: 'Não lecionar em dias consecutivos',
            prioridade: 3
          },
          {
            tipo: 'sala_preferida',
            descricao: 'Preferência por laboratórios de informática',
            valor: 'laboratorio',
            prioridade: 4
          }
        ],
        cargaHorariaMaxima: 20
      },
      {
        professor: professoresCriados[1]._id, // Dra. Maria Santos
        disciplinas: [
          { disciplina: disciplinasCriadas[3]._id, preferencia: 5 }, // Cálculo
          { disciplina: disciplinasCriadas[4]._id, preferencia: 4 }  // Álgebra Linear
        ],
        disponibilidadeHorarios: [
          {
            diaSemana: 'segunda',
            turno: 'tarde',
            horarios: [{ inicio: '14:00', fim: '18:00' }],
            disponivel: true
          },
          {
            diaSemana: 'quarta',
            turno: 'tarde',
            horarios: [{ inicio: '14:00', fim: '18:00' }],
            disponivel: true
          },
          {
            diaSemana: 'sexta',
            turno: 'manha',
            horarios: [{ inicio: '08:00', fim: '12:00' }],
            disponivel: true
          }
        ],
        restricoes: [
          {
            tipo: 'turno_preferido',
            descricao: 'Preferência pelo turno da tarde',
            valor: 'tarde',
            prioridade: 3
          }
        ],
        cargaHorariaMaxima: 18
      },
      {
        professor: professoresCriados[2]._id, // Dr. Pedro Oliveira
        disciplinas: [
          { disciplina: disciplinasCriadas[5]._id, preferencia: 5 }, // Física Geral
          { disciplina: disciplinasCriadas[6]._id, preferencia: 4 }  // Física Experimental
        ],
        disponibilidadeHorarios: [
          {
            diaSemana: 'terca',
            turno: 'manha',
            horarios: [{ inicio: '08:00', fim: '12:00' }],
            disponivel: true
          },
          {
            diaSemana: 'quinta',
            turno: 'manha',
            horarios: [{ inicio: '08:00', fim: '12:00' }],
            disponivel: true
          },
          {
            diaSemana: 'quinta',
            turno: 'tarde',
            horarios: [{ inicio: '14:00', fim: '18:00' }],
            disponivel: true
          }
        ],
        restricoes: [
          {
            tipo: 'sala_preferida',
            descricao: 'Necessita de laboratório para aulas práticas',
            valor: 'laboratorio',
            prioridade: 5
          }
        ],
        cargaHorariaMaxima: 16
      }
    ];

    for (const prefData of preferenciasData) {
      const preferencia = new ProfessorPreferencia(prefData);
      await preferencia.save();
    }

    console.log('✅ Seed do banco de dados concluído com sucesso!');
    console.log('\n📊 Dados criados:');
    console.log(`- 1 Administrador`);
    console.log(`- ${professoresCriados.length} Professores`);
    console.log(`- ${disciplinasCriadas.length} Disciplinas`);
    console.log(`- ${salasCriadas.length} Salas`);
    console.log(`- ${preferenciasData.length} Configurações de Preferências`);
    
    console.log('\n👤 Credenciais de acesso:');
    console.log('Admin: admin@universidade.edu.br / admin123');
    console.log('Professor 1: joao.silva@universidade.edu.br / professor123');
    console.log('Professor 2: maria.santos@universidade.edu.br / professor123');
    console.log('Professor 3: pedro.oliveira@universidade.edu.br / professor123');

  } catch (error) {
    console.error('❌ Erro no seed do banco de dados:', error);
    throw error;
  }
};

module.exports = seedDatabase;

