'use strict';

var request = require('superagent');

function testfairy(testfairyConfig) {
    function getActions(callback) {
        request.get(testfairyConfig.URL)
            .set('X-API-Key', testfairyConfig.secretKey)
            .end(function (error, response) {
                var actions;
                if (error) {
                    console.log(error);
                }
                actions = JSON.parse(response.text).actions;
                callback(actions);
            });
    }

    function sendCallback(action, data) {
        data.actionId = action.id;
        request.post(testfairyConfig.URL + '/callback', data)
            .set('X-API-Key', testfairyConfig.secretKey)
            .end(function (error, response) {
                console.log(response.toJSON());
            });
    }

    return {
        'sendCallback': sendCallback,
        'getActions': getActions
    };
}

module.exports = testfairy;
