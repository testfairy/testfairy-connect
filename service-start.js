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

// write the parent pid so we can implement `node service.js stop`
writePid(config.pidFile, process.pid);
process.on('SIGINT', function () {

	console.info("TFConnect SIGINT !!!!");
	writePid(config.pidFile, "");
	process.exit();
});
// var child = new (forever.Monitor)('foo.js', {
const child = new (forever.Monitor)('service-run.js', {
	// Basic configuration options
	'silent': true,            // Silences the output from stdout and stderr in the parent process
	// 'uid': 'your-UID',          // Custom uid for this forever process. (default: autogen)
	// 'pidFile': config.pidFile, // Path to put pid information for the process(es) started
	'max': 1000000,             // Sets the maximum number of times a given script should run
	'killTree': true,           // Kills the entire child process tree on `exit`
	
	// These options control how quickly forever restarts a child process
	// as well as when to kill a "spinning" process
	//
	// 'minUptime': 1000,     // Minimum time a child process has to be up. Forever will 'exit' otherwise.
	// 'spinSleepTime': 50000, // Interval between restarts if a child is spinning (i.e. alive < minUptime).

	'logFile': config.logFile, // Path to log output from forever process (when daemonized)
	'outFile': config.logFile, // Path to log output from child stdout
	'errFile': config.logFile // Path to log output from child stderr
	
}).on('start', function () {
        console.log('TestFairyConnect is running , you can find the log at ' + config.logFile);

}).on('restart', function () {
        console.log('TestFairyConnect was restarted, you can find the log at ' + config.logFile);
                                        
}).on('exit', function () {

        console.log('service-run.js exit = ' + child.childData.pid);
}).start();

function writePid(file, pid) {
	fs.writeFileSync(file, pid, 'utf8');
}

function readPid(file) {
	const pid = fs.readFileSync(file);
	return pid.toString().replace(/(\n|\r)+$/, '');
}
