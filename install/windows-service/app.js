'use strict';

var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name: 'TestFairy Connect',
    description: 'Integrates TestFairy with TFS WorkItem Collection.',
    script: process.cwd() + '/install/windows-service/app.js'
});

svc.on('install', function () {
    console.info('TestFairy Connect service successfully installed.');
    svc.start();
});

svc.on('start', function() {
    console.info('TestFairy Connect service successfully started.');
});

svc.install();
