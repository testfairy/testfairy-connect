'use strict';

module.exports = function initLogger() {

	require('console-stamp')(console, '[HH:MM:ss.l]');

	return console;
};
