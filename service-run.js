'use strict';

const fs = require('fs-extra');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
const program = require('commander');
var initLogger = require('./logger');

let defaultConfig = {
	'testfairy': {
		'timeout': 5000
	}
};

let killed = false;
const userHome = process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH;

program
	.option('-f, --file <path>', 'Set config file path. Defaults to ' + userHome + '/.testfairy-connect/config.json')
	.parse(process.argv);

const configFilePath = program.file || (userHome + '/.testfairy-connect/config.json');

if (!fs.existsSync(configFilePath)) {
	console.error('Config file (' + configFilePath + ') does not exist. Please run "testfairy-connect configure"');
	process.exit(1);
}

const config = extend(defaultConfig, JSON.parse(fs.readFileSync(configFilePath), 'utf8'));
const logger = initLogger();
const testfairy = require('./lib/testfairy-service')(config, logger);

// also support ca when contacting testfairy endpoint, in case there's a firewall
// or a proxy server that is man-in-the-middle, but is using the same certificate as issue tracker
if (config.issueTracker.ca) {
	require("./lib/crypto-extra-ca")(process, config.issueTracker.ca);
}

testfairy.logger.info('Using config file: ' + configFilePath);

const issueTracker = require('./lib/issue-tracker')(config.issueTracker, logger);
issueTracker.setEventEmitter(eventEmitter);

function main() {
	testfairy.getActions(function (actions) {

		let nextTimeout = config.testfairy.timeout;

		actions.forEach(function(action) {
			testfairy.logger.info("Received request: " + JSON.stringify(action));
			issueTracker.run(action, testfairy.sendCallback);
			nextTimeout = 0;
		});

		if (!killed) {
			setTimeout(main, nextTimeout);
		}
	});
}

eventEmitter.on('trackerInitialized', function () {
	testfairy.logger.info("TestFairy Connect is ready");
	main();
});

eventEmitter.on('trackerError', function (error, fatal) {
	const message = error[0];
	const options = error[1];
	const e = error[2];

	console.error(message + " " + e);
	testfairy.sendError(JSON.stringify(error));

	if (fatal) {
		setTimeout(function () {
			process.exit(1);
		}, 5000);
	}

});

issueTracker.initialize();
