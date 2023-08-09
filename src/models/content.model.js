const mongoose = require('mongoose');

// Schema 생성
const contentSchema = mongoose.Schema({
  Title: {
    type: String,
    require: true,
    minLength: 2,
    maxLength: 40
  },
  Content: {
    type: String,
    require: true,
    minLength: 2,
    maxLength: 500
  }, 
  Cookie: {
    type: String,
    require: true
  },
  Time: {
    type: String,
    require: true,
    default: new Date(Date.now()).toISOString().split('T')[0] + ' ' + new Date(Date.now()).toTimeString().split(' ')[0] // string 타입 주소 값이 아닌 값 자체가 나옴
  },
  Name: {
    type: String,
    require: true
  }
});

// model 생성
const Content = mongoose.model('Content', contentSchema);

module.exports = Content;