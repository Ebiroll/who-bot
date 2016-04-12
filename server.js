/*
 *  Node/Mongo server
 *
 *
 */


var express = require('express');
var http = require('http');
var w2mdb = require('./w2mdb.js');
var config = require('./config.js');
// Logging
var morgan = require('morgan');

var dbs = "mongodb://localhost:27017/who";
var mc = require('mongodb').MongoClient;
var fs = require('fs');
var bodyParser = require('body-parser')

var SlackBot = require('slackbots');
 
// create a bot   xoxb-012345678-ABC1DFG2HIJ3
// http://www.emoji-cheat-sheet.com/
try {

    var bot = new SlackBot({
        token: config.slack.token, // Add a bot https://my.slack.com/services/new/bot and put the token    
        name: config.slack.name
    });


    bot.on('start', function() {
        // more information about additional params https://api.slack.com/methods/chat.postMessage 
        var params = {
            icon_emoji: ':cat:'
        };

        // define channel, where bot exist. You can adjust it there https://my.slack.com/services  
        bot.postMessageToChannel('office', 'Hello!', params);

    });
    
} catch (e) {
   console.error("Replace token: with valid token");
}    

// One db connection for everything
mc.connect(dbs, function(err, mydb) {
    if (err) throw err;


var app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Log all 
app.use(morgan("dev"));

// add headers
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers: Content-Type, Content-Range, Content-Disposition, Content-Description');
    next();
});


app.use('/',express.static(__dirname + '/public'));
//app.use('/dist',express.static(__dirname + '../../../dist'));
//app.use('/libs',express.static(__dirname + '../../../libs'));

// Prevent, 304 (Not changed) for api
app.disable('etag');
// Database
var w2mdb = require('./w2mdb.js');


// ----- Setup counter for collections

w2mdb.initCounters("keys",1);

//------ Routing of api ---------



app.use("/api/essid",function(req,res,next){   
	w2mdb.serveDBMongo(req,res,"essid");
    });

app.use("/api/timelog",function(req,res,next){   
	w2mdb.serveDBMongo(req,res,"timelog");
    });

app.use("/api/keys",function(req,res,next){   
	w2mdb.serveDBMongo(req,res,"keys");
    });

      
function deleteOldData(){
  var now = new Date().getMinutes();
  if (now != deleteOldData.prevTime){
    // do something
    console.log('New minute has arrived,delete old data');
    //doDeleteOldData();   
  }
  deleteOldData.prevTime = now;
  setTimeout(deleteOldData,5000);
}

//Periodic check
setTimeout(deleteOldData,5000);
  
              

app.listen(3000);

});
