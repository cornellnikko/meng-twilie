var fs = require('fs');
var mysql = require('mysql');
const url = require('url');
const { parse } = require('querystring');
const util = require('util');
const ash = require('express-async-handler');
const fetch = require('node-fetch');
const Twitter = require('twitter');
const twilie = require('./twilie');

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

const getTwilieUsers = ash(async() => {
	const sqlSelectUsers = "Select * from twilie.manage where active=1;";
	const allTwilieUsers = await pool.query(sqlSelectUsers);
	return allTwilieUsers;
});

const getNewUnseenAlerts = ash(async() => {
	const alerts = await fetchNewAlerts();
	const unseenAlerts = filterAlertsByAlreadySeen(alerts);
	return unseenAlerts;
});

const runTwilieForUsersWithAlerts = ash(async (twilieUsers,unseenAlerts) => {
	var sentAlertsFromUsers = [];
	var sendResults = [];
	for(var i in twilieUsers)
	{
		sendResults = await runTwilieForUser(twilieUsers[i],unseenAlerts);
		sentAlertsFromUsers.push(sendResults);
	}
	await saveAlertsAsSeen(unseenAlerts);
	return sentAlertsFromUsers;
});

const runTwilieForUser = ash(async (user,unseenAlerts) => {

	console.log("Running Twilie For User: ",user);

	if(user["active"]!==1)
	{
		console.log("WARNING: INACTIVE ACCOUNT FOR: ",user);
		var sentTweets = {};
		sentTweets["failedTweets"] = [];
		sentTweets["successfulTweets"] = [];
		return sentTweets;
	}

	const sendResults = await sendAlertsToRecipients(unseenAlerts,user["recipients"].split(","),user["twitter_consumer_key"],user["twitter_consumer_secret"],user["twitter_access_token_key"],user["twitter_access_token_secret"]);
	//console.log("tweets sent");
	return sendResults;
});

async function fetchNewAlerts()
{
	const alerts = await fetch("https://api.weather.gov/alerts/active?area=NY").then(res=>res.json());
	return alerts.features;
}

async function filterAlertsByAlreadySeen(alerts)
{
	// 1: Return all alerts where is_processed = 0

	const selectAlertsSql = "select * from twilie.alerts";
	const allAlerts = await pool.query(selectAlertsSql);

	var filteredAlerts = [];
	var alertSeen = false;

	for(var i in alerts)
	{
		alertSeen = false;
		for(var j in allAlerts)
		{
			if(allAlerts[j]["id"] === alerts[i]["id"].split("/")[4])
			{
				alertSeen = true;
				break;
			}
		}
		if(!alertSeen)
		{
			filteredAlerts.push(alerts[i]);
		}
	}
	return filteredAlerts;
}

async function saveAlertsAsSeen(alerts)
{
	for(var i in alerts)
	{
		
		const insertAlertSql = "INSERT INTO twilie.alerts (id,headline) VALUES (?,?);";
		const alertIDString = alerts[i]["id"].split("/")[4];
		console.log("saving alert: ",alertIDString,alerts[i]["properties"]["headline"]);
		await pool.query(insertAlertSql,[alertIDString,alerts[i]["properties"]["headline"]]);
	}
}

async function sendAlertsToRecipients(alerts,recipients,twitter_consumer_key,twitter_consumer_secret,twitter_access_token_key,twitter_access_token_secret)
{
  //console.log(alerts);
  //console.log("start send alerts:",recipients,twitter_consumer_key,twitter_consumer_secret,twitter_access_token_key,twitter_access_token_secret);
  try{
  var twitterClient = new Twitter({
  consumer_key: twitter_consumer_key,
  consumer_secret: twitter_consumer_secret,
  access_token_key: twitter_access_token_key,
  access_token_secret: twitter_access_token_secret
  });
  }catch(err){
    console.log("err:",err);s
  }

  //console.log("Client ready");

  var sentTweets = {};
  sentTweets["failedTweets"] = [];
  sentTweets["successfulTweets"] = [];

  for(var alertIndex in alerts)
  {
    const alertHeadline = alerts[alertIndex].properties.headline;
    //console.log("Alert!: ",alertHeadline);
    for(var zoneIndex in alerts[alertIndex].properties.affectedZones)
    {
    	var alertZone;
      try
      {
      	alertZone = alerts[alertIndex].properties.affectedZones[zoneIndex].split("https://api.weather.gov/zones/forecast/")[1].toUpperCase();
      }
      catch (err) 
      {
      	console.log("ERROR UNKNOWN ALERT ZONE: ",alerts[alertIndex].properties.affectedZones[zoneIndex])
      }
      //console.log("  in zone:",alertZone);
      for(var recipientIndex in recipients)
      {
        const recipientZone = recipients[recipientIndex].split(":")[0];
        if(alertZone === recipientZone)
        {
          //console.log("    to recipient:",recipients[recipientIndex]);
          const recipientName = recipients[recipientIndex].split(":")[1];          
          var statusBasics = "EXERCISE EXERCISE EXERCISE "+recipientName+" EXERCISE EXERCISE EXERCISE";
          const modHeadline = alertHeadline.slice(0,279-statusBasics.length);
          //console.log("   with mod headline:",modHeadline);
          const finalTweet = "EXERCISE EXERCISE EXERCISE "+recipientName+" "+modHeadline+" EXERCISE EXERCISE EXERCISE";
          //console.log("  for final tweet: ",finalTweet.length,finalTweet);
          try{
            sendTweet(twitterClient,finalTweet);
            sentTweets["successfulTweets"].push(finalTweet);
          }
          catch(err)
          {
            sentTweets["failedTweets"].push({"attemptedTweet":finalTweet,"error:":err});
          }
        } 
      }
    }
  }
  return sentTweets;
}

function sendTweet(twitterClient,status)
{
  console.log("SEND TWEET: ",status);
  // TODO  undo after changing the rest
  return;
  try 
  {
    twitterClient.post('statuses/update', {status: status},  function(error, tweet, response) {
      if(error) throw error;
      console.log(tweet);  // Tweet body.
      console.log(response);  // Raw response object.
    });
  }
  catch(err)
  {
    console.log("SEND TWEET ERROR: ",err);
  }
}

exports.getTwilieUsers = getTwilieUsers;
exports.getNewUnseenAlerts = getNewUnseenAlerts;
exports.runTwilieForUsersWithAlerts = runTwilieForUsersWithAlerts;