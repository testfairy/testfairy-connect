'use strict';
const semver = require('semver');

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
	.version('1.0')
	.command('configure', 'run configuration wizard')
	.command('start', 'start TestFairy Connect agent')
	.command('stop', 'stop TestFairy Connect agent');

program.parse(process.argv);

if (process.argv[2] != "configure") {
	process.exit();
}
