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


var urls = [
  ['http://www.nytimes.com/','h1 a'],
  ['http://www.cnn.com/', '.cd__headline-text'],
  ['http://www.wsj.com/', '.wsj-headline-link'],
  ['http://www.foxnews.com/', '.primary h1 a'],
  ['http://www.washingtonpost.com/', '.headline a'],
  ['http://www.bbc.com/news/', '#comp-top-story-1 .title-link__title-text']
];

var promises = urls.map(scrapeNews);

Promise.all(promises)
  .then(function(images) {
    console.log('All news loaded', images);
    io.on('connection', function(socket) { 
      socket.emit('socketToMe', images );
    });
  })
  .catch(function(err) {
    console.error(err);
  });

