'use strict';

var fs = require('fs');
var extend = require('extend');

var defaultConfig = {
    'testfairy': {
        'timeout': 5000
    }
};
var killed = false;

var config = extend(defaultConfig, JSON.parse(fs.readFileSync(__dirname + '/config/config.json', 'utf8')));
var testfairy = require('./lib/testfairy-service')(config.testfairy);

testfairy.logger = console;
if (process.platform === 'win32' && process.env.WINDOWS_SERVICE) {
    var windowsEventLogger = new (require('node-windows').EventLogger)('TestFairy Connect');
    testfairy.logger = require('./install/windows-service/event-logger.js')(windowsEventLogger);
}

var issueTracker = require('./lib/issue-tracker')(config.issueTracker);
issueTracker.setLogger(testfairy.logger);


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

main();
