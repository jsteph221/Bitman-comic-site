///<reference path='types/node/node.d.ts'/>
///<reference path='types/express/express.d.ts'/> 
interface Error {
  status?: number;
}

var express = require('express');
var multer = require('multer');

var db = require('./model/db');

var routes = require('./routes');
var account = require('./routes/index');
//var project = require('./routes/project');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//var http = require('http');
var session = require('express-session');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ dest: './uploads/' }).array('myFile'));


app.use(session({ resave: true, saveUninitialized: true, secret: 'BITMAN COMICS', cookie: { maxAge: 30*60*1000 }})); //stay in session for 30 mins

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'download')));


// ===============================
// === APPLICATION USER ROUTES ===
// ===============================
app.use('/', routes);
//app.use('/users', users);

//app.post('/playback/:id', account.playback);      // Display comicstrip in progress



// ==================
// error handlers 
// ==================
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found - 404');
  err.status = 404;
  next(err);
});
    
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

module.exports = app;
