#!/usr/bin/env node
'use strict';
const semver = require('semver');
var pjson = require('./package.json');

if (semver.lt(process.version, '6.0.0')) {
	console.error("TestFairy Connect requires nodejs 6 and above");
	process.exit(1);
}

// kill process on ctrl-c
process.on('SIGINT', function () {
	process.exit();
});

var program = require('commander');

program
	.version(pjson.version)
	.command('configure', 'Tun configuration wizard')
	.command('run', 'Run TestFairy Connect agent');

program.on('command:*', function () {
	if (this._execs[program.args[0]] ) {
		return;
	}

	console.error('Invalid command: %s\n', program.args.join(' '));
	program.help();
});

// fix commander to work with global installation and 'testfairy-connect' as an executable
process.argv[1] = __filename; 

program.parse(process.argv);

