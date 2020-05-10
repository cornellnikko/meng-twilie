var express = require('express');
var secured = require('../lib/middleware/secured');
var router = express.Router();
var fs = require('fs');
var mysql = require('mysql');
const url = require('url');
const { parse } = require('querystring');
const util = require('util');
const ash = require('express-async-handler');

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
router.get('/manage', secured(), ash(async(req, res, next) => {
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

  res.render('manage.hbs', {
    user_email: userProfile.emails[0]["value"],
    twitter_consumer_key: twitter_consumer_key,
    twitter_consumer_secret: twitter_consumer_secret,
    twitter_access_token_key: twitter_access_token_key,
    twitter_access_token_secret: twitter_access_token_secret,
    active: active,
    recipients: recipients,
  });
}));

router.post('/manage/editTwilie', secured(), ash(async(req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  console.log("rall");
  console.log("req: ",req.body);
  var jsonString = '';
  req.on('data', function (data) {
    console.log("Adding data to jsonString");
      jsonString += data;
  });

  req.on('end', ash(async() => {
    requestData = JSON.parse(jsonString);

    const checkIfInSql = "select * from twilie.manage where user_email = ?;";
    const inSqlResult = await pool.query(checkIfInSql,[userProfile.emails[0]["value"]]);

    if(!inSqlResult.length)
    {
      const newTwilieManageSql = "insert into twilie.manage (user_email, twitter_consumer_key, twitter_consumer_secret, twitter_access_token_key, twitter_access_token_secret, active, recipients) values (?,?,?,?,?,?,?);";
      const result = await pool.query(newTwilieManageSql,[userProfile.emails[0]["value"],requestData["twitter_consumer_key"],requestData["twitter_consumer_secret"],requestData["twitter_access_token_key"],requestData["twitter_access_token_secret"],requestData["active"],requestData["recipients"]]);
    }
    else
    {
      const editTwilieManageSql = "update twilie.manage set twitter_consumer_key=?, twitter_consumer_secret=?, twitter_access_token_key=?, twitter_access_token_secret=?, active=?, recipients=? where user_email=?;";
      const result = await pool.query(editTwilieManageSql,[requestData["twitter_consumer_key"],requestData["twitter_consumer_secret"],requestData["twitter_access_token_key"],requestData["twitter_access_token_secret"],requestData["active"],requestData["recipients"],userProfile.emails[0]["value"]]);
    }
    var results = {};
    results["success"] = "success";
    res.status(200).json(results);
  }));
}));


module.exports = router;
