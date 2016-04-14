# who-bot
Node.js slackbot that reports users found by airodump-ng

    To install and run,
    npm install
    node server.js


Get a slack account and add a bot to it, https://slack.com/apps/manage

Edit the config.json file to match your account data.
If you dont do this correctly you will get an exception,
Error: [Slack Bot Error] invalid_auth
Otherwise you can set,
{
  "slack":{
    "use":false
   }
}


Install aircrack-ng
http://www.aircrack-ng.org/
Also get a wifi device that supports monitor mode.


Create the directory data and as user root do
> cd data
> rm *
Run monitoring of the network
> airodump-ng ifname -c 6,7  -a --output-format csv -w test

The important command line is -w test
It will create the file  data/test-01.csv that is used by the program to
find out the mac adresses.
--output-format csv prevents creating .cap capturefile that can be quite large
-c 7 Specifies listening only to channels 6 & 7
-a Only listen to associated clients.

To drop the database,
mongo
> use who;
> db.wifi.drop();