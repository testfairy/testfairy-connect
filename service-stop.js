// 'use strict';

var config = require('./config.js');
var fs = require('fs-extra');
var pidToStop = fs.readFileSync(config.pidFile);
pidToStop = pidToStop.toString().replace(/(\n|\r)+$/, '');

if (pidToStop != "") {
	console.log("TFConnect process " + pidToStop + " is stopped");
	fs.writeFileSync(config.pidFile, "", 'utf8');
	process.kill(pidToStop, 'SIGTERM');

} else {
	console.log("There is no TFConnect running process");
}


