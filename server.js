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
function reportToSlack(text,emoji) {
    if (config.slack.use) 
    {
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
                bot.postMessageToChannel(config.slack.channel, text, params);

            });

        } catch (e) {
           console.error("Replace token: with valid token");
        }    
    }
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

    if (config.slack.use) 
    {
        try {

            var bot = new SlackBot({
                token: config.slack.token, // Add a bot https://my.slack.com/services/new/bot and put the token    
                name: config.slack.name
            });


            bot.on('message', function(data) {
                // more information about additional params https://api.slack.com/methods/chat.postMessage 
                var params = {
                    icon_emoji: ':cat:'
                };

                //console.log("message ",data);
                if (data.text=='who') {
                    var text = "";
                    mydb.collection("wifi", function(err, collection) {
                        collection.find().toArray(function(err, docs) {
                          for (var qix = 0; qix < docs.length; qix++)
                          {
                              docs[qix].seen=0;
                              if (Number(docs[qix].present)==1) {
                                  text=docs[qix].alias + "," + text; 
                              } if (Number(docs[qix].seen)==1) {
                                  text=docs[qix].alias + " lurks seen at " + docs[qix].timeT + " ," + text;                                   
                              }
                          }
                        bot.postMessageToChannel(config.slack.channel, text, params);                                                    
                      });
                  });
                    
                }

            });

        } catch (e) {
           console.error("Replace token: with valid token");
        }    
    }


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
                              //console.log(lix,docs[qix].alias);
                              //console.log(" is logged\n");
                           }
                           if (Number(docs[qix].recid)>maxid)
                           {
                               maxid=Number(docs[qix].recid);
                           }
                           json_log[lix].essid=docs[qix].essid;
                           json_log[lix].user=docs[qix].user;
                           json_log[lix].alias=docs[qix].alias;
                           json_log[lix].report=docs[qix].report; 
                           json_log[lix].recid=Number(docs[qix].recid); 
                           {
                                var now = new Date (),
                                lastSeen = new Date ( docs[qix].last );
                                // Report missing if not seen for 4 minutes
                                lastSeen.setMinutes ( lastSeen.getMinutes() + 4 );
                                
                                if (docs[qix].report) {
                                       //console.log(lastSeen , " last seen\n");
                                       //console.log(now , " now\n");
                                }
                                
                                if (lastSeen<now) {
                                    json_log[lix].present=0;
                                    if (Number(docs[qix].present)==1)
                                    {
                                        if (Number(docs[qix].report)==1) {
                                           now.setHours ( now.getHours() + 2 );
                                           var report=docs[qix].alias +  " has left the office " +  now.getHours() + ":" + now.getMinutes();
                                           console.log(docs[qix].alias , " has left the building");
                                           reportToSlack(report,":cat:");
                                       }
                                    }
                                } else {
                                    json_log[lix].present=1;
                                    json_log[lix].seen=1;
                                    if (Number(docs[qix].present)==0)
                                    {
                                        now.setHours ( now.getHours() + 2 );    
                                        var report=docs[qix].alias +  " entered the office " +  now.getHours() + ":" + now.getMinutes();
                                        if (Number(docs[qix].report)==1) {
                                          console.log(docs[qix].alias , " entered");
                                          reportToSlack(report,":cat:");
                                        }
                                    }
                                }
                                
                            }
                           
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
                        json_log[lix].present=0;
                        json_log[lix].seen=1;
                        // Now this might create problems. Record id should be unique! :-P
                        // TODO, use getNextSeqNo()
                        if (!json_log[lix].recid) {
                            json_log[lix].recid=lix+maxid;
                        }
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
  

      
// Att midnight all seen attributes are removed for the who reporting
function deleteSeenToday(){
  var now = new Date().getDay();
  if (now != deleteSeenToday.prevTime){
    // do something
    console.log('New day has arrived, removed all seen');
    
    mydb.collection("wifi", function(err, collection) {
          collection.find().toArray(function(err, docs) {
            for (var qix = 0; qix < docs.length; qix++)
            {
                docs[qix].seen=0;
                collection.save(docs[qix], { w: 1} , function(err, docsa) {
                    if (err) {
                        console.log("Error saving updated seen\n");
                    }
                });
            }
        });
    });
    
       
  }
  deleteSeenToday.prevTime = now;
  setTimeout(deleteSeenToday,60000);
}

//Periodic check
setTimeout(deleteSeenToday,60000);




app.listen(3000);

});
