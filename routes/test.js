var express = require('express');
var secured = require('../lib/middleware/secured');
var router = express.Router();
var fs = require('fs');
var mysql = require('mysql');
const url = require('url');
const { parse } = require('querystring');
const util = require('util');
const ash = require('express-async-handler');
const fetch = require('node-fetch');
const Twitter = require('twitter');
const twilie = require('../twilie');


var pool = mysql.createPool({
  connectTimeout  : 60 * 60 * 1000,
  acquireTimeout  : 60 * 60 * 1000,
  timeout         : 60 * 60 * 1000,
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DBPASS,
  port: process.env.DBPORT
});
pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.')
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.')
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused.')
    }
  }

  if (connection) connection.release()

  return
})
pool.query = util.promisify(pool.query)

/* GET user profile. */
router.get('/test', secured(), ash(async(req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;

  const checkIfInSql = "SELECT * from twilie.manage WHERE user_email=?";
  const result = await pool.query(checkIfInSql, [userProfile.emails[0]["value"]]);

  var twitterkey = "";
  var active = "";
  var recipients = "";
  var twitter_consumer_key;
  var twitter_consumer_secret;
  var twitter_access_token_key;
  var twitter_access_token_secret;
  if(result.length)
  {
    twitterkey = result[0]["twitterkey"];
    active = result[0]["active"];
    recipients = result[0]["recipients"];
    twitter_consumer_key=result[0]["twitter_consumer_key"];
    twitter_consumer_secret=result[0]["twitter_consumer_secret"];
    twitter_access_token_key=result[0]["twitter_access_token_key"];
    twitter_access_token_secret=result[0]["twitter_access_token_secret"];
  }

  res.render('test.hbs', {
    user_email: userProfile.emails[0]["value"],
    twitter_consumer_key: twitter_consumer_key,
    twitter_consumer_secret: twitter_consumer_secret,
    twitter_access_token_key: twitter_access_token_key,
    twitter_access_token_secret: twitter_access_token_secret,
    active: active,
    recipients: recipients,
  });
}));

router.post('/test/testTwilie', secured(), ash(async(req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;

  const checkIfInSql = "SELECT * from twilie.manage WHERE user_email=?";
  const result = await pool.query(checkIfInSql, [userProfile.emails[0]["value"]]);
  const twilieUsers = result;
  const unseenAlerts = await twilie.getNewUnseenAlerts();
  const sendResults = await twilie.runTwilieForUsersWithAlerts(twilieUsers,unseenAlerts);
  res.status(200).json(sendResults);  
}));

module.exports = router;
