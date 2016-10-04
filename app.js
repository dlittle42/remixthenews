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

//for NLP
var pos = require('pos');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var debug = false;

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

   // socket.emit('sendHeadlines', 'A new user has joined!' );
    scrapeMultiple();

    socket.on('event', function(data) {
        console.log('A client sent us this dumb message:', data.message);
        var remix  = generateHeadline(newsPosArr);
        socket.emit('sendRemix', remix.toString());
    });


    socket.on('getSingleSource', function(data) {
        console.log('A client sent us this dumb message:', data.message);
        scrapeSingle();
    });

    socket.on('getMultipleSource', function(data) {
        console.log('A client sent us this dumb message:', data.message);
        scrapeMultiple();
    });
/*
    socket.on('single', function(data) {
        console.log('From single function', data.message);
        var remix  = generateHeadline(newsPosArr);
        socket.emit('sendRemix', remix.toString());
    });
    */
});

module.exports = {app: app, server: server};

var x = new Xray()
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

function scrapeMultiple(){
  

  var promises = urls.map(scrapeNews);
  var newsPosArr = [];
  var matches = [];
  //var tagArr =[];

  Promise.all(promises)
    .then(function(headlines) {
      console.log('All news loaded', headlines);
      newsPosArr = getPOS(headlines);


      console.log(Object.keys(io.sockets.connected).length);
/*
      if(isConnected()){
        socket.emit('sendHeadlines', headlines );
      }else{
        io.on('connection', function(socket) { 

          console.log("NOW??"+Object.keys(io.sockets.connected).length);
          socket.emit('sendHeadlines', headlines );
        });
      }
      */

      io.emit('sendHeadlines', headlines );
      
    }).then(function() {
      log('step two');
      var remix = generateHeadline(newsPosArr);
      /*
      if(isConnected()){
        socket.emit('sendRemix', remix.toString());
      }else{
        io.on('connection', function(socket) { 
          socket.emit('sendRemix', remix.toString());
        });
      }
      */
      io.emit('sendRemix', remix.toString());
      


    })
    .catch(function(err) {
      console.error(err);
    });



}

function isConnected(){
  if (Object.keys(io.sockets.connected).length >0 ){
    return true;
  }else{
    return false;
  }
}


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

function scrapeSingle(url){
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
       newsPosArr = getPOS(headlines);
       var remix = generateHeadline(newsPosArr);
       //console.log(remix);
  /*
       if(isConnected()){
          console.log('ALREADY CONNECTED!!!!')
          socket.emit('sendRemix', remix.toString());
          socket.emit('sendHeadlines', headlines );
       }else{
        
       
         io.on('connection', function(socket) { 
          socket.emit('sendRemix', remix.toString());
          socket.emit('sendHeadlines', headlines );

        });
       }
       */
       io.emit('sendRemix', remix.toString());
          io.emit('sendHeadlines', headlines );
       callback(null, headlines) // do something with the objects?
     }   
   })
}

/// .... or just call one site for 5 headlines
//scrapeSingle();


function getPOS(texts){
  log('getPOS go!');
  //var pos = require('pos');
  var news = texts;
  newsPosArr = [];
  for (var n in news){
  //  console.log(news[n])
    var title = news[n];
    var words = new pos.Lexer().lex(title);
    var taggedWords = new pos.Tagger().tag(words);
    if (debug) console.dir(taggedWords)
    newsPosArr.push([ urls[n][0], title, taggedWords]);

  }

  return newsPosArr;

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
  //  term.push(word);
    

    log("@@@@@ FIND MATCH FOR "+ pos[v][1]+" @@@@@@@@@@@@@@");

    for (var n in news){
    
      var words = news[n][2];
     // console.log(words)
      for (i in words) {
          var tag = words[i][1];
          var word = words[i][0];

         // if (tag == pos[v][1] && term.indexOf(word) != -1) {
          if (tag == pos[v][1]){
            log('adding ' + word + " /" + tag);
            term.push(word);
          }
          

          
      }
    }
    matches.push(term);

  }

  //console.log("************      MATCHES     **********************    ");
 // console.log(matches);


  return matches;


}

function generateHeadline(arr){
  matches = []
  var tagArr = chooseRandomModel(arr);
  log("============   RANDOM  STRUCTURE  ================")
  log(tagArr)
  buildPos(arr, tagArr);
  log("************      MAKE SENTENCE     **********************    ");
  var remix = buildHeadline(matches);

 return remix;
 
}

function buildHeadline(matches){
  // choose random word from each POS array
  log("Word Count = "+ matches.length);
  var newHeadline= [];
  log("NEW HEADLINE ARR RESET??? "+ newHeadline)
  for (var n in matches){
    /*
    var len = getRandomInt(0, matches[n].length-1);
    console.log("-- len = "+ len);
    console.log(matches[n][len]);
    var nextWord = matches[n][len];
    while (newHeadline.indexOf(nextWord) != 1) {
        text += "The number is " + i;
        i++;
    }
    */

    // eliminate duplicate terms in new sentence
    do {
      var len = getRandomInt(0, matches[n].length-1);
      log("-- len = "+ len);
      log(matches[n][len]);
      var nextWord = matches[n][len];
    } while (newHeadline.indexOf(nextWord) != -1);
  //  if (newHeadline.indexOf(nextWord) != 1 ){

      newHeadline.push(nextWord);
  //  }else{
  //    console.log('Duplicate Word! '+ nextWord)
  //  }
    

  }
  console.log(newHeadline.join(" "));
  return newHeadline.join(" ");
}


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function log(val){
  if(debug) console.log(val);
}


 //// Run Promise to scrape 5 sites 0r....
scrapeMultiple();

/// .... or just call one site for 5 headlines
//scrapeSingle();



//console.log(new pos.Lexer().lex("I made $5.60 today in 1 hour of work.  The E.M.T.'s were on time, but only barely.").toString());
