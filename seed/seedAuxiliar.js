const mongoose = require('mongoose');
const Discipline = require('../models/discipline.model');
const Timetable = require('../models/timetable.model');
const connectDB = require('../config/db');
const disciplinesData = require('../data/disciplines.json');
const allocationData = require('../data/allocation.json');
//require('dotenv').config({ path: '../.env' }); // Load env from backend root
require('dotenv').config({ path: '../.env' }); // Load env from backend root

const semester = "2025.1";
const turmaMapping = {
    "1ano": { code: "IIW2025A", yearLevel: 1 },
    "2ano": { code: "IIW2024A", yearLevel: 2 },
    "3ano": { code: "IIW2023A", yearLevel: 3 }
};

const seedDB = async () => {
  await connectDB(); // Ensure DB connection

  try {
    console.log('Clearing existing data...');
    await Discipline.deleteMany({});
    await Timetable.deleteMany({});
    console.log('Existing data cleared.');

    console.log('Seeding disciplines...');
    // Insert disciplines as is (they are defined by ID)
    await Discipline.insertMany(disciplinesData);
    console.log(`${disciplinesData.length} disciplines seeded.`);

    console.log('Seeding timetables...');
    const timetablesToSeed = {};

    // Group allocation data by year level prefix
    for (const slotId in allocationData) {
        if (allocationData.hasOwnProperty(slotId)) {
            const disciplineId = allocationData[slotId];
            const [yearLevelPrefix, ...rest] = slotId.split('_'); // e.g., "1ano", "seg", "h1"

            if (!turmaMapping[yearLevelPrefix]) {
                console.warn(`Skipping unknown year level prefix in allocation: ${slotId}`);
                continue;
            }

            const { code: turmaCode, yearLevel } = turmaMapping[yearLevelPrefix];

            if (!timetablesToSeed[turmaCode]) {
                timetablesToSeed[turmaCode] = {
                    turmaCode: turmaCode,
                    semester: semester,
                    yearLevel: yearLevel,
                    schedule: {}
                };
            }

            // Store the allocation mapping
            timetablesToSeed[turmaCode].schedule[slotId] = disciplineId;
        }
    }

    // Convert the grouped data into documents and insert
    const timetableDocs = Object.values(timetablesToSeed);
    await Timetable.insertMany(timetableDocs);
    console.log(`${timetableDocs.length} timetables seeded (${Object.keys(allocationData).length} total slots processed).`);

    console.log('Seeding complete!');

  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1); // Exit with error code
  } finally {
    mongoose.connection.close(); // Close DB connection
    console.log('Database connection closed.');
  }
};

seedDB();