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
var issueTracker = require('./lib/issue-tracker')(config.issueTracker);

function main() {
    testfairy.getActions(function (actions) {
        var i,
            actionCount;

        for (i = 0, actionCount = actions.length; i < actionCount; i += 1) {
            console.log(actions[i]);
            issueTracker.run(actions[i], testfairy.sendCallback);
        }

        if (!killed) {
            setTimeout(main, config.testfairy.timeout);
        }
    });
}

main();
