'use strict';

switch (process.platform) {
case 'win32':
    require(__dirname + '/windows-service/app.js');
    process.exit(0);
    break;
default:
    console.warn('Platform not supported: ' + process.platform + '. Please run TestFairy Connect manually.');
    process.exit(0);
}
