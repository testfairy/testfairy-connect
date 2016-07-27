'use strict';

var request = require('superagent');

function testfairy(testfairyConfig) {
    var service;

    function getActions(callback) {
        request.get(testfairyConfig.URL)
            .set('X-API-Key', testfairyConfig.apiKey)
            .end(function (error, response) {
                var actions;
                if (error) {
                    service.logger.error(error);
                    return;
                }
                actions = JSON.parse(response.text).actions;
                callback(actions);
            });
    }

    function sendCallback(action, data) {
        data.actionId = action.id;
        request.post(testfairyConfig.URL + '/callback', data)
            .set('X-API-Key', testfairyConfig.apiKey)
            .end(function (error, response) {
                service.logger.info(response.text);
            });
    }

    service = {
        'sendCallback': sendCallback,
        'getActions': getActions
    };
    return service;
}

module.exports = testfairy;
