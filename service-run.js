'use strict';

var fs = require('fs-extra');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
var program = require('commander');
var initLogger = require('./logger')

var defaultConfig = {
	'testfairy': {
		'timeout': 5000
	}
};

var killed = false;
var userHome = process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH;

program
	.option('-f, --file <path>', 'Set config file path. Defaults to ' + userHome + '/.testfairy-connect/config.json')
	.parse(process.argv);

const configFilePath = program.file || (userHome + '/.testfairy-connect/config.json');

if (!fs.existsSync(configFilePath)) {
	console.error('Config file (' + configFilePath + ') does not exist. Please run "testfairy-connect configure"');
	process.exit(1);
}

var config = extend(defaultConfig, JSON.parse(fs.readFileSync(configFilePath), 'utf8'));
var logger = initLogger();
var testfairy = require('./lib/testfairy-service')(config.testfairy, logger);

testfairy.logger.info('Using config file: ' + configFilePath);

var issueTracker = require('./lib/issue-tracker')(config.issueTracker, logger);
issueTracker.setEventEmitter(eventEmitter);

function main() {
	testfairy.getActions(function (actions) {
		var i,
			actionCount;

		for (i = 0, actionCount = actions.length; i < actionCount; i += 1) {
			testfairy.logger.info("Received request: " + JSON.stringify(actions[i]));
			issueTracker.run(actions[i], testfairy.sendCallback);
		}

		if (!killed) {
			var nextTimeout = (actionCount > 0) ? 0 : config.testfairy.timeout; // do not sleep if there was an action
			setTimeout(main, nextTimeout);
		}
	});
}

eventEmitter.on('trackerInitialized', function () {
	testfairy.logger.info("TestFairy Connect is ready");
	main();
});

eventEmitter.on('trackerError', function (error, fatal) {
	testfairy.sendError(error[1]);
	testfairy.logger.error(error[0] +' , ' + error[1]);
	if (fatal) {
		setTimeout(function () {
			process.exit(2)
		}, 5000);
	}

});

issueTracker.initialize();
