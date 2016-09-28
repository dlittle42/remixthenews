var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
 //res.io.emit("socketToMe", "users");
  //res.send('respond with a resource.');
  res.render('index', { title: 'respond with a resource.' });
});

module.exports = router;