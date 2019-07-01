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
	.option('--foreground', 'Run TestFairy Connect in foreground (do not daemonize)')
	.command('configure', 'Tun configuration wizard')
	.command('start', 'Start TestFairy Connect agent')
	.command('stop', 'Stop TestFairy Connect agent');

program.parse(process.argv);

if (program.args[0] != 'configure' && !program.foreground) {
	process.exit();
}

