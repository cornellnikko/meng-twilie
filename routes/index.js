var express = require('express');
const mysql = require("mysql")
var fs = require('fs');
const util = require('util');
var router = express.Router();
const ash = require('express-async-handler');

/* GET home page. */
router.get('/', function (req, res, next) {
	if(typeof(res.locals.user) !== "undefined")
	{
		res.redirect("/manage")
	}
	else
	{
		res.render('index.hbs', { title: 'Twilie - Login or Register' });
	}
});

module.exports = router;