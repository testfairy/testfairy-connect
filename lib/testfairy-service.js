'use strict';

function testfairy(testfairyConfig) {
	var service;

	var pjson = require('./../package.json');
	var request = require('superagent');
	require('superagent-proxy')(request); // extend with Request#proxy()

	function reportError(error) {
		var errorMessage;
		if (error.code == 'ETIMEDOUT') {
			errorMessage = "Connection timeout out, cannot reach " + error.address + ":" + error.port;
		} else if (error.code == 'ECONNRESET') {
			errorMessage = "Connection reset, cannot reach " + error.address + ":" + error.port;
		} else {
			errorMessage = "An error has occurred: " + error;
		}
		service.logger.error(errorMessage);
		service.logger.error(error);
	}

	function getActions(callback) {
		var r = request.get(testfairyConfig.URL + "?version=" + pjson.version + "&pid=" + process.pid);
		if (testfairyConfig.proxy) {
			r = r.proxy(testfairyConfig.proxy);
		}

		r.set('X-API-Key', testfairyConfig.apiKey)
		.end(function (error, response) {
			if (error) {
				reportError(error);
				callback([]); // send an empty set of actions
				return;
			}

			var actions = JSON.parse(response.text).actions;
			callback(actions);
		});
	}

	function sendCallback(action, data) {
		data.actionId = action.id;
		var r = request.post(testfairyConfig.URL + '/callback', data);
		if (testfairyConfig.proxy) {
			r = r.proxy(testfairyConfig.proxy);
		}

		r.set('X-API-Key', testfairyConfig.apiKey)
			.end(function (error, response) {
				if (error) {
					reportError(error);
					return;
				}

				service.logger.info("Sending response: " + JSON.stringify(data));
			});
	}

	function sendError(data) {
		var r = request.post(testfairyConfig.URL + '/error', data);
		if (testfairyConfig.proxy) {
			r = r.proxy(testfairyConfig.proxy);
		}

		r.set('X-API-Key', testfairyConfig.apiKey)
			.end(function (error) {
				if (error) {
					reportError(error);
					return;
				}
			});
	}

	service = {
		'sendCallback': sendCallback,
		'sendError': sendError,
		'getActions': getActions
	};

	return service;
}

module.exports = testfairy;
