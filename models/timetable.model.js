const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  turmaCode: { type: String, required: true, unique: true }, // e.g., IIW2025A
  semester: { type: String, required: true },        // e.g., 2025.1
  yearLevel: { type: Number, required: true },       // e.g., 1, 2, 3
  schedule: { type: Map, of: String, default: {} }   // Maps slotId (e.g., 'seg_h1') to disciplineId
});

module.exports = mongoose.model('Timetable', TimetableSchema);

