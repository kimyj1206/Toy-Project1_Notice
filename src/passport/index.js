// 해당 파일은 serialize, deserialize 작성

const passport = require('passport');
const User = require('../models/users.model');
const local = require('./strategy');

// 로그인 성공 시 해당 사실을 세션 스토어에 저장함 -> 로그인 성공 시 한번만 호출
module.exports = () => {
  passport.serializeUser((User, done) => {
    done(null, User.Id); // session에 id 저장
});

// 로그인 성공 후 각 페이지에 접속 시 로그인한 사용자인지 아닌지 체크해줌

// 수정 필요
  passport.deserializeUser((Id, done) => {
    User.findOne({ Id: Id }
      .then(() => { done(null, User) })
      .catch((error) => { done(error) })
    )}
  );
  local()
};


// passport.deserializeUser((Id, done) => {
//   User.findOne({Id: Id}, (err, inUser) => {  
    
//     if (err) { return done(err); }

//     if (!inUser) { return done(null, false, { message: '로그인이 필요합니다.'}); }
//   })
// });

// local();
// }