'use strict';

var exec = require('child_process').exec;

switch (process.platform) {
case 'win32':
    exec("npm install -g node-windows & npm link node-windows", function (error) {
        if (error) {
            console.error(error);
            process.exit(-1);
        } else {
            require(__dirname + '/windows-service/app.js');
            process.exit(0);
        }
    });
    break;
default:
    console.warn('Platform not supported: ' + process.platform + '. Please run TestFairy Connect manually.');
    process.exit(0);
}
