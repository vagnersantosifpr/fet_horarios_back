const mongoose = require('mongoose');

const DisciplineSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  shortName: { type: String, required: true },
  professorKey: { type: String, required: true },
  cssClass: { type: String },
  blockHours: { type: Number, required: true }
});

module.exports = mongoose.model('Discipline', DisciplineSchema);
