'use strict';
const userHome = process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH;

// const logFile = "/var/logs/testfairy-connect.log";
// const pidFile  = '/var/run/testfairy-connect.pid';
module.exports = {
	logFile : userHome + '/.testfairy-connect/testfairy-connect.log',
	pidFile : userHome + '/.testfairy-connect/pid.log'
};

// export config;