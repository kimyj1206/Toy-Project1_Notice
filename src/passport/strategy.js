// local 및 sns 로그인 인증을 위한 strategy 파일

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/users.model');

// local strategy
module.exports = () => {
  passport.use('local', new LocalStrategy({
  usernameField: 'Id',
  passwordField: 'Password',
  passReqToCallback: true // express의 req 객체 접근 가능 여부
}, (req, Id, Password, done) => {
    // login form에서 데이터가 전송되면 해당 콜백함수가 호출된다.
    // 그렇게 들어오는 정보가 db 정보와 맞다면 함수 done에 2번째 인자로 false가 아닌 user 대입
    // done에 실제 데이터를 넘겨주면 그 데이터는 passport.serializeUser의 콜백함수 호출

    try {
      // 하나의 document만 콜백 함수의 두번째 인자로 전달
      User.findOne({ Id: Id, Password: Password }, (error, inUser) => {
        if (error) { return console.error(err); }

        if (!inUser) { return done(null, false, { message: 'Id 혹은 Password를 잘못 입력하셨습니다.'}); }

        return done(null, inUser);
      })
    } catch (error) {
      console.error(error);
    }

  }));
}