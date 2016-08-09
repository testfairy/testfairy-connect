'use strict';

function issueTracker(options) {
    var trackerImplementation = require('./types/' + options.type);
    trackerImplementation.options = options;

    function run(action, callback) {
        var actionCallback = function (data) {
            callback(action, data);
        };
        switch (action.name) {
            case 'create-issue':
                trackerImplementation.createIssue(action.data, actionCallback);
                break;
            case 'update-issue':
                trackerImplementation.updateIssue(action.data, actionCallback);
                break;
            case 'list-projects':
                trackerImplementation.listProjects(actionCallback);
                break;
            case 'list-issues':
                trackerImplementation.listIssues(action.data, actionCallback);
                break;
            case 'test':
                trackerImplementation.test(action.data, actionCallback);
                break;
        }
    }

    return {
        'run': run,
        'initialize': function () {
            trackerImplementation.initialize();
        },
        'setLogger': function (logger) {
            trackerImplementation.logger = logger;
        },
        'setEventEmitter': function (eventEmitter) {
            trackerImplementation.eventEmitter = eventEmitter;
        },
        'listProjects': function (callback) {
            trackerImplementation.listProjects(callback);
        }
    };
}

module.exports = issueTracker;
