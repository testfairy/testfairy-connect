'use strict';

var exec = require('child_process').exec;

switch (process.platform) {
case 'win32':
    var installWindowsServiceCommand = 'npm install -g node-windows' +
        ' & npm link node-windows' +
        ' & node ./install/windows-service/service-management.js install';
    exec(installWindowsServiceCommand, function (error) {
        if (error) {
            console.error(error);
            process.exit(-1);
        } else {
            console.info('TestFairy Connect Service npm package successfully installed');
            process.exit(0);
        }
    });
    break;
default:
    console.warn('Couldn\'t configure service on platform: ' + process.platform + '. No worries! You can still run TestFairy Connect manually.');
    process.exit(0);
}
