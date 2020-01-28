'use strict';

function issueTracker(options, logger) {
	var trackerImplementation = require('./types/' + options.type);
	trackerImplementation.options = options;

	function run(action, callback) {
		var actionCallback = function (data) {
			callback(action, data);
		};

		switch (action.name) {
			case 'create-issue':
				if (action.data) {
					trackerImplementation.createIssue(action.data, actionCallback);
				}
				break;

			case 'list-projects':
				trackerImplementation.listProjects(actionCallback);
				break;

			case 'list-issues':
				if (action.data) {
					trackerImplementation.listIssues(action.data, actionCallback);
				}
				break;

			case 'test':
				if (action.data) {
					trackerImplementation.test(action.data, actionCallback);
				}
				break;

			case 'createmeta':
				if (action.data) {
					trackerImplementation.createMeta(action.data, actionCallback);
				}
				break;
		}
	}

	trackerImplementation.logger = logger;

	return {
		'run': run,
		'initialize': function () {
			trackerImplementation.initialize();
		},
		'setEventEmitter': function (eventEmitter) {
			trackerImplementation.eventEmitter = eventEmitter;
		},
		'listProjects': function (callback) {
			trackerImplementation.listProjects(callback);
		},
		'logger': trackerImplementation.logger
	};
}

module.exports = issueTracker;
