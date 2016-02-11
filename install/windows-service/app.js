'use strict';

var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name: 'TestFairy Connect',
    description: 'Integrate TestFairy with TFS WorkItem Collection.',
    script: process.cwd() + '/install/windows-service/app.js'
});

svc.on('install', function () {
    svc.start();
});

svc.install();
