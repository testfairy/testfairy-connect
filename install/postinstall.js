'use strict';

switch (process.platform) {
case 'win32':
    process.exec("npm install -g node-windows & npm link node-windows", function (error, stdout, stderr) {
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
