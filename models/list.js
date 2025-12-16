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
    type: [Number],
    required: false,
  },
});

const List = mongoose.model('List', listSchema);

module.exports = List;