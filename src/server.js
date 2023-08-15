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
const secretText = 'hello world';
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
// app.use(function (req, res, next) {
//   if (req.session && !req.session.regenerate) {
//     req.session.regenerate = (cb) => {
//       cb();
//     }
//   }
//   if (req.session && !req.session.save) {
//     req.session.save = (cb) => {
//       cb();
//     }
//   }
//   next();
// });

// serialize 및 deserialize 불러옴
serializeConfig();

// mongoose 설정
mongoose.set('strictQuery', false);
mongoose.connect(`mongodb+srv://kimyj159297:kimyj7288@express-cluster.o37sbdu.mongodb.net/?retryWrites=true&w=majority`)
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
      // user의 고유 id를 가지고 쿠키 생성
      res.cookie('cookieSession', user._id.toString(), {
        signed: false,
        httpOnly: true,
        maxAge: 3600 * 24
      });
      // user의 닉네임을 가지고 쿠키 생성
      res.cookie('userName', user.Name, {
        signed: false,
        httpOnly: true,
        maxAge: 3600 * 24 * 240
      });
      return res.redirect('/');
    }
  })(req, res, next)
});

// 로그아웃
app.get('/logout', (req, res) => {
  if(req.headers.cookie) {
    // 쿠키 변경이 됐는지 여부를 확인해야 함.
    // res.cookie('cookieSession', secretText, { maxAge: 0 });
    // res.clearCookie('cookieSession', {
    //   signed: true,
    //   httpOnly: true
    // });
    res.cookie('cookieSession');
    res.cookie('userName');
    res.cookie('session');
    res.status(200).redirect('/');
  } else {
    res.status(500).json('로그아웃 실패 다시 시도 바람');
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
      const cookieSplit = req.headers.cookie.split('; ');
      const cookieSessionValue = cookieSplit.find(cookie => cookie.startsWith("cookieSession"));
      const cookieValue = cookieSessionValue.substring(14, 38);

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
// 로그인한 사용자가 가진 쿠키 고유값과 content 테이블에 저장된 사용자의 쿠키 값이 일치하면 수정 버튼 생성
app.get('/detail/:contentId', async (req, res) => {
  try {
    const contentId = req.params.contentId;
    const contentInfo = await Content.findById(contentId);
    // console.log('contentInfo : ' + contentInfo);

    const cookieValue = req.headers.cookie.split('; ');
    const cookieSessionCookie = cookieValue.find(cookie => cookie.startsWith("cookieSession")); // 원리 알아보기

    let allowEdit = false; // Initialize to false by default

    if (cookieSessionCookie) {
      const cookieSessionValue = cookieSessionCookie.split("=")[1];
        if (cookieSessionValue == contentInfo.Cookie) {
          allowEdit  = true;
        }
    } else {
      console.log("cookieSession cookie not found");
    }
    res.render('detail', { "content": contentInfo, "allowEdit": allowEdit });
  } catch(error) {
    res.status(500).json({ error : '상세 게시물을 읽어들이는데 실패했습니다.' })
  }
});

// -> 등록 버튼 클릭 -> db 저장 -> 화면에 수정된 게시글의 정보가 노출 -> 이전 정보는 사라짐

// UPDATE CONTENT
// 해당 사용자가 자신의 게시물 수정 버튼 클릭 시 content 고유 아이디로 db 조회해서 사용자에게 수정할 수 있게 보여줌
app.get('/content/update/:contentId', async (req, res) => {
  try {
    const contentId = req.params.contentId;
    const contentDetail = await Content.findById(contentId);
    res.render('update', { contentDetail: contentDetail });
  } catch (error) {
    res.status(500).json('수정 접근 실패 ' + error.message);
  }

});

app.post('/content/update/:contentId', async (req, res) => {
  try {
    // const contentId = req.params.contentId;
    const { contentId } = req.params;
    console.log('contentId : ' + contentId);

    // 게시글의 Content와 db 이름의 Content가 중복이어서 find를 하지 못하는 에러 발생했었음.
    const { Title, content, Cookie, Time, Name } = req.body;
    const updateContent = {
      Title,
      Content : content,
      Cookie,
      Time,
      Name
    };

    const updatedContent = await Content.findOneAndUpdate({ _id : contentId }, updateContent, { new : true });
    console.log('updated : ' + updatedContent);
    
    if (updatedContent) {
      console.log('Content updated successfully');
      res.redirect('/');
    } else {
      res.status(404).json('Content not found');
    }
  } catch (error) {
    res.status(500).json('게시물 수정 실패 ' + error.message);
  }
});

// DELETE CONTENT
app.get('/content/delete/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const deleteContent = await Content.findById(contentId);
    res.render('delete', { deleteContent: deleteContent });
  } catch (error) {
    res.status(500).json('삭제 접근 실패 ' + error.message);
  }
});

app.post('/content/delete/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const delContent = await Content.findByIdAndDelete(contentId);
    console.log(delContent);

    if (delContent) {
      console.log('Content deleted successfully');
      res.redirect('/');
    } else {
      res.status(404).json('Content delete failed');
    }
  } catch (error) {
    res.status(500).json('게시물 삭제 실패 ' + error.message);
  }
});







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


// done의 방향은? / 저장된 사용자의 _id로 로그인 여부 확인 / 쿠키 암호화
// 로그인한 사용자의 id가 화면 상단에 노출되는 기능 추가 요청 / logout 페이지 처리 추가하면 좋을듯..? -> alert 처리 / 수정 업데이트 시 시간 변경 안됨