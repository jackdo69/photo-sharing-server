const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const photoSchema = new Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    image: {type: String, required: true},
    creator: {type: mongoose.Types.ObjectId, required: true, ref: 'User'},
    likedBy: [{type: mongoose.Types.ObjectId, ref: 'User'}]
});

module.exports = mongoose.model('Photo', photoSchema)