'use strict';

var exec = require('child_process').exec;

switch (process.platform) {
case 'win32':
    exec("npm install -g node-windows & npm link node-windows & node ./install/windows-service/app.js install", function (error) {
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
    console.warn('Platform not supported: ' + process.platform + '. Please run TestFairy Connect manually.');
    process.exit(0);
}
