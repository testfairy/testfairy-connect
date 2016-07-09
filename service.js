'use strict';

var program = require('commander');

program
    .version('1.0');

program
    .command('configure', 'run configuration wizard')
    .command('run', 'run TestFairy Connect agent', {isDefault: true});

program.parse(process.argv);

