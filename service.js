'use strict';

// kill process on ctrl-c
process.on('SIGINT', function() {
    process.exit();
});

var program = require('commander');

program
    .version('1.0');

program
    .command('configure', 'run configuration wizard')
    .command('run', 'run TestFairy Connect agent', {isDefault: true});

program.parse(process.argv);

