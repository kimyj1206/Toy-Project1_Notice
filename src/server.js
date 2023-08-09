// 변수 선언
const express= require('express');
const app = express();
const PORT = 3003;
const mongoose = require('mongoose');
const User = require('./models/users.model');
const Content = require('./models/content.model');
const passport = require('passport');
const path = require('path');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const passportConfig = require('./passport/strategy');
const serializeConfig = require('./passport/index');

// PORT 설정
app.listen(PORT, () => {
  console.log(`CONNECTION SERVER ${PORT}`);
});

// 유효성 검사
app.use(express.urlencoded( { extended : false } ));
// json 형식의 폼 요청 들어오면 파싱
app.use(express.json());

// session 및 passport 설정 순서 변경 시 미들웨어 필요 오류 발생
const secretText = 'qwertasdfgzxcvb';
app.use(cookieParser(secretText)); // cookieParser는 req 객체의 cookies 속성에 할당 / 요청된 쿠키를 쉽게 추출할 수 있는 미들웨어

// cookieSession : client의 session data를 cookie에 저장
// expressSession : client의 session 식별자만 cookie에 저장, session data를 server(db)에 저장
// cookieSession middleware 사용
app.use(cookieSession({
  keys: secretText,
  resave: false, // session에 아무런 변경사항이 없어도 다시 저장할지 여부
  saveUninitialized: false, // session에 아무런 작업이 이루어지지 않아도 저장할지 여부
}));

passportConfig(); // 해당 코드 삭제 시 Error: Unknown authentication strategy "local" 오류 발생

// passport 설정
// 해당 프로젝트에 passport 미들웨어를 초기화
app.use(passport.initialize());
// req.session 객체에 passport 정보를 추가 저장, 해당 코드가 실행되면 세션쿠키 정보를 바탕으로 passport의 deserializeUser() 실행 / 앞서 정의한 cookieSession 정보와 연동
app.use(passport.session());

// passport랑 cookie-session 같이 사용해서 발생하는 에러를 막아주는 코드
app.use(function (req, res, next) {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb) => {
      cb();
    }
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb) => {
      cb();
    }
  }
  next();
});

// serialize 및 deserialize 불러옴
serializeConfig();

// mongoose 설정
mongoose.set('strictQuery', false);
mongoose.connect()
 .then(() => {console.log('Connected to MongoDB')})
 .catch((err) => {console.log(err)}); 

// ejs 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 라우터 설정
app.get('/join', (req, res) => {
  res.render('join');
});

// 회원가입
app.post('/join', async (req, res) => {
  const user = new User(req.body);
  console.log(req.body);
  try {
    await user.save();
    res.redirect('/login');
  } catch (error) {
    console.error("회원가입 error! " + error);
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

// 로그인
// post 메소드로 login 경로에 접속 시 passport.authenticate 함수를 호출함.
// pending 문제가 있으나 로그인 실패 시 문구 출력 됨 => 해결(로그인이 성공한다면 다음 액션이 있어야 하는데 해당 코드 미작성으로 pending 상태였음. else문 추가로 해결)
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (error, user, message) => {
    if (error) { next(error); }

    if (!user) {
      console.log('user가 없을 때 : ' + message);
      return res.redirect('/login');
    } else {
      // cookie 생성
      res.cookie('cookieSession', user._id.toString(), {
        signed: true,
        httpOnly: true,
        maxAge: 3600 * 24 * 6000
      });
      res.cookie('userName', user.Name, {
        signed: false,
        httpOnly: true,
        maxAge: 3600 * 24 * 6000
      });
      return res.redirect('/');
    }
  })(req, res, next)
});

// 로그아웃
app.get('/logout', (req, res) => {
  if(req.headers.cookie) { // 쿠키 변경이 됐는지 여부를 확인해야 함.
    res.cookie('cookieSession', secretText, {maxAge: 0})
    res.send(`로그아웃되셨습니다. <html><body><p><a href="/">홈으로 돌아가기</a><p></body></html>`);
  } else {
    res.redirect('/');
  }
});

// 게시글 작성
app.get('/content', (req, res) => {
  res.render('content');
});

// CREATE CONTENT
app.post('/content', (req, res, next) => {
  try {
    // 게시글 등록 시 해당 사용자가 cookie를 가지고 있다면 cookie에서 사용자의 고유 id만 추출
    if (req.headers.cookie) {
      const cookieValue = req.headers.cookie.substring(req.headers.cookie.indexOf('%') + 3, req.headers.cookie.indexOf('.'));

      if (mongoose.Types.ObjectId.isValid(cookieValue)) {
        User.findById(cookieValue)
          .then((inUser, err) => {
            if (err) {
              console.error(err);
            }
            if (!inUser) {
              console.log('db user not found');
            } else {
              req.body["Cookie"] = cookieValue; // req.body에 강제로 쿠키 값 넣음
              req.body["Name"] = inUser.Name; // req.body에 user name 강제 주입
              const content = new Content(req.body);
              content.save();
              res.redirect('/');
            }
          }).catch((err) => { next(err); })
      } else {
        console.log('사용자를 찾지 못했습니다.')
        }
    } else {
      console.log('No cookie!');
      res.redirect('/join');
    }
  } catch (error) {
    console.error("게시글 error! : " + error);
    }
});

// READ CONTENT
app.get('/', async (req, res) => {
  try {
    const contentAll = await Content.find({}).sort({ createdAt: -1 });
    res.render('index',  { contents : contentAll } );
  } catch (error) {
    res.status(500).json({ error: '게시물을 가져오는데 실패했습니다.' });
  }
});

// DETAIL CONTENT
app.get('/detail/:contentId', async (req, res) => {
  try {
    const contentId = req.params.contentId
    const contentInfo = await Content.findById(contentId); // contentId를 통해 Content 전체가 튀어나옴

    // res.render('detail', { content : contentInfo });

    const cookieValue = req.headers.cookie.substring(req.headers.cookie.indexOf('%') + 3, req.headers.cookie.indexOf('.'));
    // if (cookieValue == contentInfo.Cookie) {
      
    //   // res.send(`<html><body><p><a href="/content/update">게시글 수정하러 가기</a></p></body></html>`);
      
    //   // res.locals.allowEdit = true;
    // } else {
    //   console.log(error.message);
    // }



  } catch(error) {
    res.status(500).json({ error : '상세 게시물을 읽어들이는데 실패했습니다.' })
  }
});


// 수정 중
app.use((req, res, next) => {
  return res.render('detail', { content : contentInfo })
});

app.use((req, res, next) => {
  return res.send(`<html><body><p><a href="/content/update">게시글 수정하러 가기</a></p></body></html>`);
});






// 로그인한 사용자가 가진 쿠키 고유값과 content 테이블에 저장된 사용자의 쿠키 값이 일치하면 수정 버튼 생성

// UPDATE CONTENT
app.get('', (req, res) => {

});

// DELETE CONTENT





// 사용자가 로그인을 한지 여부를 판단할 수 있는건? -> 쿠키는 안됨 수명이 있기때문에 유지가 됨, 근데 페이지 요청 시 현 사용자의 쿠키를 같이 보내면?
// 사용자가 로그인을 함 -> 로그인 한 사용자만 볼 수 있는 페이지에 접근 가능(메인, 상세 게시글, 게시글 작성) / 회원가입, 로그인 화면 접근 불가
function authLogin(req, res) {
  if (req.headers.cookie) {

  }
};

// 사용자가 로그인을 안함 -> 로그인 안한 사용자만 볼 수 있는 페이지에 접근 가능(메인, 회원가입, 로그인) / 상세 게시글, 게시글 화면 접근 불가
function notAuthLogin(req, res) {
  if (!req.headers.cookie) {
    res.redirect('/login'); // pending으로 무한로딩 수정필요

  }
};




//  done의 방향은? / 저장된 사용자의 _id로 로그인 여부 확인 / 쿠키 암호화 / 로그인한 사용자의 id가 화면 상단에 노출되는 기능 추가 요청 / logout 페이지 처리 추가하면 좋을듯..? /

// 아래는 error 코드
// app.post('/login', function(req, res) {

//   passport.authenticate('local', (err, user, info) => {
//     if (err) { console.log(info); }

//     if (!user) {
//       console.log(info);
//     } else {
//       res.redirect('/');
//     }
//   })(req, res)
// });


// app.post('/login', passport.authenticate('local', (err, user, info) => {
//   console.log('1111');
//     if (err) { console.log(info); }
//     console.log('2222');
  
//     if (!user) {
//       console.log(info);
//       res.redirect('/join');
//     }
//     console.log('3333');
//     res.redirect('/');
//   })
// );

// 원본 코드
  // const content = new Content(req.body);
  // console.log("req.body : ", req.body);

  // try {
  //   await content.save();
  //   res.redirect('/');
  // } catch (error) {
  //   console.error("게시글 error! : " + error);
  // }