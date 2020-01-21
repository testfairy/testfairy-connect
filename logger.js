'use strict';

module.exports = function initLogger() {
	const { createLogger, format, transports } = require('winston');
	const { combine, timestamp, align, simple , colorize, printf} = format;
	require('winston-daily-rotate-file');
	const config = require('./config.js');

	const logFormat = combine(
		colorize(),
		timestamp(),
		align(),
		printf(
			info => `${info.timestamp} ${info.level}: ${info.message}`,
		));

	const dailyRotateTransport = new (transports.DailyRotateFile)({
		filename: config.logFile,
		datePattern: 'YYYY-MM-DD',
		maxSize: '100M',
		maxFiles: '10d',
		format: logFormat,
	});

	return createLogger({
		transports: [
			dailyRotateTransport,
			// new transports.Console({
			// 	format: logFormat,
			// }),
		]
	});
};
