const express = require('express');
const UserRouter = express.Router();
const userModel = require('../models/users.model');

// 회원 가입
UserRouter.post('/join', async (req, res, next) => {
  // user라는 객체를 생성
  // req에서 나온 값을 대입
  // 디비 저장
  

});

module.exports = UserRouter;