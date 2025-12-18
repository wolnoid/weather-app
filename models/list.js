const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  locations: {
    type: [Object],
    required: false,
  },
});

listSchema.index({ owner: 1, name: 1 }, { unique: true });
const List = mongoose.model('List', listSchema);

module.exports = List;