'use strict';

function testfairy(testfairyConfig) {
    var service;

    var request = require('superagent');
    require('superagent-proxy')(request); // extend with Request#proxy()

    function reportError(error) {
        if (error.code == 'ETIMEDOUT') {
            service.logger.error("Connection timeout out, cannot reach " + error.address + ":" + error.port);
        } else if (error.code == 'ECONNRESET') {
            service.logger.error("Connection reset, cannot reach " + error.address + ":" + error.port);
        } else {
            service.logger.error("An error has occurred: " + error);
        }
    }

    function getActions(callback) {
        var r = request.get(testfairyConfig.URL);
        if (testfairyConfig.proxy) {
            r = r.proxy(testfairyConfig.proxy)
        }

        r.set('X-API-Key', testfairyConfig.apiKey)
        .end(function (error, response) {
            var actions;
            if (error) {
                reportError(error);
                callback([]); // send an empty set of actions
                return;
            }

            actions = JSON.parse(response.text).actions;
            callback(actions);
        });
    }

    function sendCallback(action, data) {
        data.actionId = action.id;
        var r = request.post(testfairyConfig.URL + '/callback', data);
        if (testfairyConfig.proxy) {
            r = r.proxy(testfairyConfig.proxy)
        }

        r.set('X-API-Key', testfairyConfig.apiKey)
        .end(function (error, response) {
            if (error) {
                reportError(error);
                return;
            }

            service.logger.info("Sending response: " + response.text);
        });
    }

    service = {
        'sendCallback': sendCallback,
        'getActions': getActions
    };

    return service;
}

module.exports = testfairy;
