var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// for scraping
var Promise = require("bluebird")
var Xray = require('x-ray')
var util = require('util')
///

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(function(req, res, next){
  res.io = io;
  next();
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

io.on('connection', function(socket) {  

   // socket.emit('socketToMe', 'A new user has joined!' );

    socket.on('event', function(data) {
        console.log('A client sent us this dumb message:', data.message);
        var remix  = generateHeadline();
        socket.emit('sendRemix', remix.toString());
    });
});

module.exports = {app: app, server: server};



var x = new Xray()


function scrapeNews(url) {
  return new Promise(function(resolve, reject) {
    x(url[0], url[1], [{
        title: '@text'
    }])(function (err, obj) {

        if (err) 
          reject(err);
        else
          resolve(obj[0].title);

    });
  });
}

function scrapeSingleSite(url){
  var headlines = [];
  x("http://www.nytimes.com/", '.theme-summary .story-heading', [{
     title: '@text'
   }])((err, obj) => {
     if(err) {
       callback(err);
     }
     else {
      // obj.forEach((item) => {
      for (var n=0; n< 5; n++){
         //console.log(obj[n].title);
         headlines.push(obj[n].title);
       }
       console.log(headlines);
       callback(null, obj) // do something with the objects?
     }   
   })
}





var urls = [
  //['http://www.nytimes.com/','h1 a'],
 // ['http://www.nytimes.com/','.lede a'],
  ['http://www.nytimes.com/','#top-news .story-heading a'],
  ['http://www.cnn.com/', '.cd__headline-text'],
  ['http://www.wsj.com/', '.wsj-headline-link'],
 // ['http://www.foxnews.com/', '.primary h1 a'],
  ['http://www.washingtonpost.com/', '.headline a'],
  ['http://www.bbc.com/news/', '#comp-top-story-1 .title-link__title-text']
];



//// Run Promise to scrape 5 sites 0r....
/*
var promises = urls.map(scrapeNews);
var newsPosArr = [];
var matches = [];
//var tagArr =[];

Promise.all(promises)
  .then(function(headlines) {
    console.log('All news loaded', headlines);
    getPOS(headlines)

    io.on('connection', function(socket) { 
      socket.emit('socketToMe', headlines );
    });
  }).then(function() {
    console.log('step two');
    var remix = generateHeadline();
    io.on('connection', function(socket) { 
      socket.emit('sendRemix', remix.toString());
    });


  })
  .catch(function(err) {
    console.error(err);
  });
*/


/// .... or just call one site for 5 headlines
scrapeSingleSite();


function getPOS(texts){
  var pos = require('pos');
  var news = texts;
  for (var n in news){
  //  console.log(news[n])
    var title = news[n];
    var words = new pos.Lexer().lex(title);
    var taggedWords = new pos.Tagger().tag(words);
    console.dir(taggedWords)
    newsPosArr.push([ urls[n][0], title, taggedWords]);
    /*
    for (i in taggedWords) {
        var taggedWord = taggedWords[i];
        var word = taggedWord[0];
        var tag = taggedWord[1];

        console.log(word + " /" + tag);
    }
    */
  }
  console.log('------------------------')
  console.log(newsPosArr)
/*
  console.log('------------------------')
  console.log('------------------------')
  console.log('------------------------')
  console.log(newsPosArr[0][2][1][0])
*/
console.log('------------------------>>>')
 // tagArr = chooseRandomModel(newsPosArr);
  //console.log("============   RANDOM  STRUCTURE  ================")
  //console.log(tagArr)
  //console.log("============   END RANDOM  STRUCTURE  ================")
  console.log('++++++++++++++')
 // console.log(buildPos(newsPosArr, tagArr));

  /*
  var speak = require('speakeasy-nlp');
  console.log(speak.classify('NJ commuter train hit platform'));
  console.log('------------------------')
  */
/*
  for (var n in news){
    console.log(news(n))
    var words = new pos.Lexer().lex(news(n));
    var taggedWords = new pos.Tagger().tag(words);
    console.dir(taggedWords)
    for (i in taggedWords) {
        var taggedWord = taggedWords[i];
        var word = taggedWord[0];
        var tag = taggedWord[1];

        console.log(word + " /" + tag);
    }
  }
*/
}

function chooseRandomModel(arr){
  // choose random headline as sentence model.
  // 
  var len = getRandomInt(0, arr.length-1);
  return arr[len][2];
}

function buildPos(news, pos){
  // loop through each headline array looking for POS match 
  //var matches= [];

  for (v in pos){

    var word = pos[v][0];
    
    var term = [];
    term.push(word);
    

console.log("@@@@@ FIND MATCH FOR "+ pos[v][1]+" @@@@@@@@@@@@@@");

    for (var n in news){
    
      var words = news[n][2];
     // console.log(words)
      for (i in words) {
          var wordPos = words[i][1];
          if (wordPos == pos[v][1]) {
            var matchWord = words[i][0];
            var tag = wordPos;
            console.log(matchWord + " /" + tag);
            term.push(matchWord);
          }
          

          
      }
    }
    matches.push(term);

  }

  console.log("************      MATCHES     **********************    ");
  console.log(matches);
      console.log("============   RANDOM  STRUCTURE  ================")
 // console.log(tagArr)
  console.log("============   END RANDOM  STRUCTURE  ================")


  return matches;


}

function generateHeadline(){
  matches = []
  var tagArr = chooseRandomModel(newsPosArr);
  console.log("============   RANDOM  STRUCTURE  ================")
  console.log(tagArr)
  buildPos(newsPosArr, tagArr);
  console.log("************      MAKE SENTENCE     **********************    ");
  var remix = buildHeadline(matches);

 return remix;
 
}

function buildHeadline(matches){
  // choose random word from each POS array
  console.log(matches.length);
  var newHeadline= [];
  console.log("NEW HEADLINE ARR RESET??? "+ newHeadline)
  for (var n in matches){
    
    var len = getRandomInt(0, matches[n].length-1);
    console.log("-- len = "+ len);
    console.log(matches[n][len]);
    newHeadline.push(matches[n][len]);

  }
  console.log(newHeadline.join(" "));
  return newHeadline.join(" ");
}


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


