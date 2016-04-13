# who-bot
Node.js slackbot that reports users found by airodump-ng


Get a slack account and add a bot to, https://whosthere.slack.com/apps/manage

Edit the config.json file to match your account data.
If you dont do this correctly you will get an exception,
Error: [Slack Bot Error] invalid_auth

Install aircrack-ng



Create the directory data and as user root do
> cd data
> rm *
Run monitoring of the 
> airodump-ng ifname -c 7  -a -w test

The important command line is -w test
It will create the file  data/test-01.csv that is used by the program to
find out the mac adresses.


To drop the database,
mongo
> use who;
> db.wifi.drop();