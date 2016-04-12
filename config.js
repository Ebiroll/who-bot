var fs = require('fs');

console.log("Loading configuration file");

data = fs.readFileSync("./config.json", 'utf8');

var config = JSON.parse(data);
				
module.exports = config;
				
