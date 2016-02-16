'use strict';
/**
 * Wrapper for nodewindows.EventLogger
 * The idea was to make it behave more like console.
 *
 * @param wrapped
 * @returns {{log: info, info: info, error: error, warn: warn}}
 */
var logger = function (wrapped) {
    function escapeArguments(args) {
        return JSON.stringify(args).replace(/\"/g, '\\"').replace(/\\+/g, '\\').replace(/(?:\\[rnt])+/g, ' ');
    }

    var info = function () {
            wrapped.info(escapeArguments(arguments));
        },
        error = function () {
            wrapped.error(escapeArguments(arguments));
        },
        warn = function () {
            wrapped.warn(escapeArguments(arguments));
        };
    return {
        'log': info,
        'info': info,
        'error': error,
        'warn': warn
    };
};

module.exports = logger;
