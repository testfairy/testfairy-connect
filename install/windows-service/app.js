'use strict';

var Service = require('node-windows').Service;
var jsPath = process.cwd() + '\\service.js';

// Create a new service object
var svc = new Service({
    name: 'TestFairy Connect',
    description: 'Integrates TestFairy with TFS WorkItem Collection.',
    script: jsPath
});

svc.on('install', function () {
    console.info('TestFairy Connect service successfully installed.');
    svc.start();
});

svc.on('uninstall', function () {
    console.info('TestFairy Connect service successfully uninstalled.');
});

svc.on('start', function () {
    console.info('TestFairy Connect service successfully started.');
});

svc.on('stop', function () {
    console.info('TestFairy Connect service successfully stopped.');
});

var action = process.argv[2];

switch (action) {
case 'install':
    svc.install();
    break;
case 'uninstall':
    svc.uninstall();
    break;
case 'start':
    svc.start();
    break;
case 'stop':
    svc.stop();
    break;
default:
    svc.install();
}

