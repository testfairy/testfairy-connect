'use strict';
var forever = require('forever-monitor');
var fs = require('fs-extra');
var config = require('./config.js');
fs.ensureFileSync(config.logFile);
fs.ensureFileSync(config.pidFile);

const pid = readPid(config.pidFile);
if (pid !== "") {
	console.info("TFConnect already running");
	return;
}

let child;

function exit() {

	if (child) {
		console.info("Stopping the chile process " + child.childData.pid);
		process.kill(child.childData.pid);
	}
	writePid(config.pidFile, "");
	process.exit(0);
}
// write the parent pid so we can implement `testfairy-connect stop`
writePid(config.pidFile, process.pid);
// process.on('SIGINT', exit);
// process.on('SIGHUP', exit);
process.on('SIGTERM', exit);


var program = require('commander');

const userHome = process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH;

program
	.option('-f, --file <path>', 'Set config file path. Defaults to ' + userHome + '/.testfairy-connect/config.json')
	.parse(process.argv);

const configFilePath = program.file || (userHome + '/.testfairy-connect/config.json');

child = new (forever.Monitor)('service-run.js', {
	args: ['-f', configFilePath],
	silent: true,            // Silences the output from stdout and stderr in the parent process
	max: 1000000,             // Sets the maximum number of times a given script should run
	killTree: true,           // Kills the entire child process tree on `exit`
	spinSleepTime: 1000, // Interval between restarts if a child is spinning (i.e. alive < minUptime).

	logFile: config.logFile, // Path to log output from forever process (when daemonized)
	outFile: config.logFile, // Path to log output from child stdout
	errFile: config.logFile // Path to log output from child stderr

}).on('start', function () {
        console.log('TestFairyConnect is running , you can find the log at ' + config.logFile);
}).start();

function writePid(file, pid) {
	fs.writeFileSync(file, pid, 'utf8');
}

function readPid(file) {
	const pid = fs.readFileSync(file);
	return pid.toString().replace(/(\n|\r)+$/, '');
}
