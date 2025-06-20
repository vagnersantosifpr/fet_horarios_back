// models/PublicContent.js
const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '⭐'
  }
});

const updateSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['feature', 'bugfix', 'improvement', 'security'],
    default: 'feature'
  }
});

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'geral'
  }
});

const publicContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'Bem-vindo ao FET Horários'
  },
  welcomeMessage: {
    type: String,
    required: true
  },
  features: [featureSchema],
  updates: [updateSchema],
  faq: [faqSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PublicContent', publicContentSchema);

