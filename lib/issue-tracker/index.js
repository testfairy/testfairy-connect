'use strict';

function issueTracker(options, logger) {
	const trackerImplementation = require('./types/' + options.type);
	trackerImplementation.options = options;
	trackerImplementation.logger = logger;

	function run(action, callback) {
		const actionCallback = function (data) {
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

			case 'createmeta':
				if (action.data) {
					trackerImplementation.createMeta(action.data, actionCallback);
				}
				break;
		}
	}

	return {
		run: run,
		initialize: function () {
			trackerImplementation.initialize();
		},
		setEventEmitter: function (eventEmitter) {
			trackerImplementation.eventEmitter = eventEmitter;
		},
		listProjects: function (callback) {
			trackerImplementation.listProjects(callback);
		},
		logger: trackerImplementation.logger,
	};
}

module.exports = issueTracker;
