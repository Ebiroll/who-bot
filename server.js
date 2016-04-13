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
var fs = require('fs');



var dbs = "mongodb://localhost:27017/who";
var mc = require('mongodb').MongoClient;
var fs = require('fs');
var bodyParser = require('body-parser')

var SlackBot = require('slackbots');
 
 
 /*
 * Convert a CSV String to JSON
 */
convert = function(csvString) {
    var json = [];
    var csvArray = csvString.split("\n");
    var clientArray=[];
    var foundHead=false;

    // We are only interestd in clients, end of data
    for (i=0;i<csvArray.length;i++) 
    {
        if (csvArray[i].substring(0,12)=="Station MAC,") {
            foundHead=true;
        }
        if (foundHead) {
            clientArray.push(csvArray[i]);
        }
    }

    // Remove the column names from csvArray into csvColumns.
    var head=clientArray.shift();
    var csvColumns=["MAC","first","last","pwr","packets","BSSID","probed"]

    clientArray.forEach(function(csvRowString) {

        var csvRow = csvRowString.split(",");

        // Here we work on a single row.
        // Create an object with all of the csvColumns as keys.
        jsonRow = new Object();
        for ( var colNum = 0; colNum < csvRow.length; colNum++) {
            // Remove beginning and ending quotes since stringify will add them.
            var colData = csvRow[colNum].replace(/^['"]|['"]$/g, "");
            jsonRow[csvColumns[colNum]] = colData;
        }
        json.push(jsonRow);
    });

    return json;
};
 
 
 
 
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



app.use("/api/wifi",function(req,res,next){   
	w2mdb.serveDBMongo(req,res,"wifi");
    });

app.use("/api/timelog",function(req,res,next){   
	w2mdb.serveDBMongo(req,res,"timelog");
    });

app.use("/api/keys",function(req,res,next){   
	w2mdb.serveDBMongo(req,res,"keys");
    });


function openCSVFileAndProcessData() {
    
 
    console.log("Loading data file\n");

    data = fs.readFileSync("./data/test-01.csv", 'ascii');


    var json_log=convert(data);
    
    //console.log(json_log);

    var maxid=0;
    var collection = mydb.collection("wifi", function(err, collection) {
            collection.find().toArray(function(err, docs) {
                for (var lix=0;lix<json_log.length;lix++)
                {                   
                    for (var qix = 0; qix < docs.length; qix++)
                    {
                        if (json_log[lix].MAC==docs[qix].essid) {
                           if (docs[qix].alias.length>1) {
                              console.log(docs[qix].alias);
                              console.log(" is here\n");
                           }
                           if (Number(docs[qix].recid)>maxid)
                           {
                               maxid=Number(docs[qix].recid);
                           }
                           json_log[lix].essid=docs[qix].essid;
                           json_log[lix].user=docs[qix].user;
                           json_log[lix].alias=docs[qix].alias;
                           json_log[lix].report=docs[qix].report; 
                           json_log[lix].recid=docs[qix].recid; 
                       }
                    }
                }
                // Save json log json_log[lix].
                for (var lix=0;lix<json_log.length;lix++)
                {
                    var doc=json_log[lix];
                    // Set id to mac..
                    doc._id=json_log[lix].MAC;
                    json_log[lix].essid=json_log[lix].MAC;
                    if (!json_log[lix].user) {
                        json_log[lix].user="";
                        json_log[lix].alias="";
                        json_log[lix].report=0;
                        // Now this might create problems. Record id should be unique! :-P
                        // TODO, use getNextSeqNo()
                        json_log[lix].recid=lix+maxid;
                    }
                    
                    var lastSeen=json_log[lix].last;
                    if (lastSeen) {
                        var lastArray = lastSeen.split(" ");
                        json_log[lix].lastD=lastArray[1];
                        json_log[lix].lastT=lastArray[2];
                        json_log[lix].last=lastArray[1] + "T" + lastArray[2] + "Z";
                        // Only save when 3 or more packets seen
                        if (Number(json_log[lix].packets)>3) {
                            collection.save(doc, { w: 1} , function(err, docsa) {
                                if (err) {
                                    console.log("Error saving\n");
                                }
                            });
                        }
                    }
                }                
            });
    });
}

      
function deleteOldData(){
  var now = new Date().getMinutes();
  if (now != deleteOldData.prevTime){
    // do something
    console.log('New minute has arrived,process data');
    openCSVFileAndProcessData();   
  }
  deleteOldData.prevTime = now;
  setTimeout(deleteOldData,5000);
}

//Periodic check
setTimeout(deleteOldData,5000);
  
              

app.listen(3000);

});
