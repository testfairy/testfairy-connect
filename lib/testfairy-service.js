'use strict';

function testfairy(testfairyConfig) {
    var service;

    var request = require('superagent');
    require('superagent-proxy')(request); // extend with Request#proxy()

    function getActions(callback) {
        var r = request.get(testfairyConfig.URL)
            .set('X-API-Key', testfairyConfig.apiKey);

        if (testfairyConfig.proxy) {
            r = r.proxy(testfairyConfig.proxy)
        }

        r.end(function (error, response) {
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
        var r = request.post(testfairyConfig.URL + '/callback', data)
            .set('X-API-Key', testfairyConfig.apiKey);

        if (testfairyConfig.proxy) {
            r = r.proxy(testfairyConfig.proxy)
        }

        r.end(function (error, response) {
            if (error) {
                service.logger.error(error);
                return;
            }

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
