'use strict';

function testfairy(testfairyConfig, logger) {
	var service;

	const pjson = require('./../package.json');
	const request = require('superagent');
	require('superagent-proxy')(request); // extend with Request#proxy()

	function reportError(error) {

		let errorMessage;

		if (error.code === 'ETIMEDOUT') {
			errorMessage = "Connection timeout out, cannot reach " + error.address + ":" + error.port;
		} else if (error.code === 'ECONNRESET') {
			errorMessage = "Connection reset, cannot reach " + error.address + ":" + error.port;
		} else {
			errorMessage = "An error has occurred: " + error;
		}

		service.logger.error(errorMessage);
		service.logger.error(error);
	}

	function getActions(callback) {
		let r = request.get(testfairyConfig.URL + "?version=" + pjson.version + "&pid=" + process.pid);
		if (testfairyConfig.proxy) {
			r = r.proxy(testfairyConfig.proxy);
		}

		r.timeout(20000);
		r.set('X-API-Key', testfairyConfig.apiKey);
		r.end(function (error, response) {
			if (error) {
				reportError(error);
				callback([], error); // send an empty set of actions
				return;
			}

			const actions = JSON.parse(response.text).actions;
			callback(actions);
		});
	}

	function sendCallback(action, data) {
		data.actionId = action.id;
		let r = request.post(testfairyConfig.URL + '/callback', data);
		if (testfairyConfig.proxy) {
			r = r.proxy(testfairyConfig.proxy);
		}

		r.set('X-API-Key', testfairyConfig.apiKey);
		r.end(function (error, response) {
			if (error) {
				reportError(error);
				return;
			}

			service.logger.info("Sending response: " + JSON.stringify(data));
		});
	}

	function sendError(data) {
		let r = request.post(testfairyConfig.URL + '/error', data);
		if (testfairyConfig.proxy) {
			r = r.proxy(testfairyConfig.proxy);
		}

		r.set('X-API-Key', testfairyConfig.apiKey);
		r.end(function (error) {
			if (error) {
				reportError(error);
			}
		});
	}

	service = {
		'sendCallback': sendCallback,
		'sendError': sendError,
		'getActions': getActions,
		'logger': logger
	};

	return service;
}

module.exports = testfairy;
