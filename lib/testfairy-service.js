'use strict';

function testfairy(config, logger) {
	var service;

	const testfairyConfig = config.testfairy;

	const pjson = require('./../package.json');
	const request = require('superagent');
	require('superagent-proxy')(request); // extend with Request#proxy()

	function getRequest(method, url, data) {
		let r;

		switch (method) {
			case "get":
				r = request.get(url);
				break;

			case "post":
				r = request.post(url, data);
				break;

			default:
				return null;
		}

		if (testfairyConfig.proxy) {
			r = r.proxy(config.testfairy.proxy);
		}

		r.set('X-API-Key', config.testfairy.apiKey);

		return r;
	}

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
		const r = getRequest("get", testfairyConfig.URL + "?version=" + pjson.version + "&pid=" + process.pid);
		r.timeout(20000);
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
		const r = getRequest("post", testfairyConfig.URL + '/callback', data);
		r.end(function (error, response) {
			if (error) {
				reportError(error);
				return;
			}

			service.logger.info("Sending response: " + JSON.stringify(data));
		});
	}

	function sendError(data) {
		let r = getRequest("post", testfairyConfig.URL + '/error', data);
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
