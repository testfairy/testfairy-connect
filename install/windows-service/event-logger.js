'use strict';
/**
 * Wrapper for nodewindows.EventLogger
 * The idea was to make it behave more like console.
 *
 * @param wrapped
 * @returns {{log: info, info: info, error: error, warn: warn}}
 */
var logger = function (wrapped) {
    var info = function () {
            wrapped.info(JSON.stringify(arguments).replace(/"/g, '\\"'));
        },
        error = function () {
            wrapped.error(JSON.stringify(arguments).replace(/"/g, '\\"'));
        },
        warn = function () {
            wrapped.warn(JSON.stringify(arguments).replace(/"/g, '\\"'));
        };
    return {
        'log': info,
        'info': info,
        'error': error,
        'warn': warn
    };
};

module.exports = logger;
