const mongoose = require('mongoose');

// schema 생성
const UserSchema = mongoose.Schema({
  Id: {
    type: String,
    trim: true,
    unique: true,
    required: true,
    minLength: 5,
    maxLength: 20
  },
  Password: {
    type: String,
    trim: true,
    required: true,
    minLength: 5,
    maxLength: 30
  },
  Name: {
    type: String,
    required: true,
    trim: true
  },
  Email: {
    type: String,
    trim: true
  },
  Number: {
    type: Number,
    trim: true
  }
});

// schema model 생성
const User = mongoose.model('User', UserSchema);

module.exports = User;