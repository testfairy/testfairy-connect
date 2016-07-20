'use strict';

var fs = require('fs-extra');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
var program = require('commander');

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

var configFilePath = program.file || (userHome + '/.testfairy-connect/config.json');

if (!fs.existsSync(configFilePath)) {
    console.error('Config file (' + configFilePath + ') does not exist. Please run "node service.js configure"');
    process.exit(1);
}

console.info('Using config file: ' + configFilePath);
var config = extend(defaultConfig, JSON.parse(fs.readFileSync(configFilePath), 'utf8'));
var testfairy = require('./lib/testfairy-service')(config.testfairy);

testfairy.logger = console;
if (process.platform === 'win32' && process.env.WINDOWS_SERVICE) {
    var windowsEventLogger = new (require('node-windows').EventLogger)('TestFairy Connect');
    testfairy.logger = require('./install/windows-service/event-logger.js')(windowsEventLogger);
} else {
    require('console-stamp')(console, '[HH:MM:ss.l]');
}

var issueTracker = require('./lib/issue-tracker')(config.issueTracker);
issueTracker.setLogger(testfairy.logger);
issueTracker.setEventEmitter(eventEmitter);

function main() {
    testfairy.getActions(function (actions) {
        var i,
            actionCount;

        for (i = 0, actionCount = actions.length; i < actionCount; i += 1) {
            testfairy.logger.info(JSON.stringify(actions[i]));
            issueTracker.run(actions[i], testfairy.sendCallback);
        }

        if (!killed) {
            if (actionCount) {
                // do not sleep if there was an action
                main();
            } else {
                setTimeout(main, config.testfairy.timeout);
            }
        }
    });
}

eventEmitter.on('trackerInitialized', function () {
    testfairy.logger.log("TestFairy Connect is ready");
    main();
});

issueTracker.initialize();

