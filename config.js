'use strict';
const userHome = process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH;

module.exports = {
	logFile: userHome + '/.testfairy-connect/testfairy-connect.log',
};

