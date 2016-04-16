'use strict';

var fs = require('fs-extra');
var extend = require('extend');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();

var defaultConfig = {
    'testfairy': {
        'timeout': 5000
    }
};
var killed = false;

var userHome = process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH;

if (!fs.existsSync(userHome + '/.testfairy-connect')) {
    fs.mkdirSync(userHome + '/.testfairy-connect', 511);
    fs.copySync(__dirname + '/config/jira-example.config.json', userHome + '/.testfairy-connect/jira-example.config.json');
    fs.copySync(__dirname + '/config/tfs-example.config.json', userHome + '/.testfairy-connect/tfs-example.config.json');
}

if (!fs.existsSync(userHome + '/.testfairy-connect/config.json')) {
    console.error('Config file ($HOME/.testfairy-connect/config.json) does not exist. Plese check examples in your $HOME/.testfairy-connect.');
    process.exit(1);
}

var config = extend(defaultConfig, JSON.parse(fs.readFileSync(userHome + '/.testfairy-connect/config.json'), 'utf8'));
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
            setTimeout(main, config.testfairy.timeout);
        }
    });
}

eventEmitter.on('trackerInitialized', main);
issueTracker.initialize();

