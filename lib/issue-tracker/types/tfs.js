'use strict';
var exec = require('child_process').exec;
var tfsIssueTracker = {};

module.exports = tfsIssueTracker;

/**
 * Parse tfpt create item command output
 * @param stdout
 * @returns {{issueKey: *}}
 */
function parseTfsCreateItemResponse(stdout) {
	var str = stdout.toString(),
		regex = /^Work item ([0-9]+) created/,
		result = str.match(regex),
		id = result[1];
	return {'issueKey': id};
}

/**
 * Parse tfpt query command output
 * @param stdout
 * @returns {Array}
 */
function parseTfsQueryResponse(stdout) {
	var lines = stdout.toString().split('\r\n'),
		regex = /^([^\t]+)\t([^\t]+)\t([^\t]+)\t([^\t]+)/,
		parsedLine,
		result = [],
		i,
		count;

	for (i = 0, count = lines.length; i < count; i += 1) {
		parsedLine = lines[i].match(regex);
		if (parsedLine !== null) {
			result.push({
				'issueKey': parsedLine[1],
				'status': parsedLine[2],
				'summary': parsedLine[3],
				'description': parsedLine[4]
			});
		}
	}
	return result;
}

/**
 * Compile semicolon separated string of name=value field pairs to be used by tfs /fields: cmd line option
 * @param data
 * @returns {string}
 */
function buildFieldsString(data) {
	var fields = [],
		mapping = tfsIssueTracker.options.fieldMapping,
		key;
	for (key in mapping) {
		if (mapping.hasOwnProperty(key) && data.hasOwnProperty(key)) {
			fields.push(mapping[key] + '=' + data[key].replace(/\;/g, ';;').replace(/\n/g, '<br>'));
		}
	}

	return fields.join(';');
}

tfsIssueTracker.createIssue = function (options, callback) {
	var workitemType = this.options.workitemType || 'Bug',
		command = 'tfpt workitem /new "' + options.projectKey + '\\' + workitemType + '"' +
			' /fields:"' + buildFieldsString(options) + '"' +
			' /collection:"' + this.options.URL + '"';
	this.logger.info(command);
	exec(command, function (error, stdout) {
		if (error) {
			tfsIssueTracker.eventEmitter.emit('trackerError', ['Error creating issue:', options, error]);

		} else {
			var data = parseTfsCreateItemResponse(stdout);
			data.issueId = options.issueId;
			data.projectURL = tfsIssueTracker.options.URL + '/' + options.projectKey;
			data.issueURL = data.projectURL + '/_workItems/index#_a=edit&id=' + data.issueKey;
			if ("token" in options) {
				data.token = options.token;
			}
			callback(data);
		}
	});
};

tfsIssueTracker.updateIssue = function (options, callback) {
	var command = 'tfpt workitem /update ' + options.issueKey +
		' /fields:"' + buildFieldsString(options) + '"' +
		' /collection:"' + this.options.URL + '"';
	this.logger.info(command);
	exec(command, function (error, stdout, stderr) {
		//parse stdout
		if (error) {
			tfsIssueTracker.eventEmitter.emit('trackerError', ['Error updating issue:', options, error]);

		} else if (stdout.toString().indexOf('updated') < 0) {
			tfsIssueTracker.eventEmitter.emit('trackerError', ['Error updating issue:', options, stdout, stderr]);
		} else {
			//issueKey not necessarily needed - action will know both issueKey and issueId
			callback({'issueKey': options.issueKey});
		}
	});
};

tfsIssueTracker.listProjects = function (callback) {

	var query = 'SELECT [System.TeamProject]' +
			' FROM WorkItems' +
			' WHERE State IN (\'New\', \'Active\', \'In Progress\', \'To Do\', \'Approved\')',
		command;

	query = query.replace(/\"/g, '\\"');
	command = 'tfpt query /collection:' + this.options.URL + ' /wiql:"' + query + '" /include:data';
	exec(command, function (error, stdout) {
		var outputLines,
			name,
			names = [],
			i;
		//parse stdout
		if (error) {
			tfsIssueTracker.eventEmitter.emit('trackerError', ['Error listing projects:', error]);

		} else if (stdout.toString().trim().length === 0) {
			tfsIssueTracker.eventEmitter.emit('trackerError', 'No projects found');
		} else {
			outputLines = stdout.split('\n');
			for (i = 0; i < outputLines.length; i++) {
				name = outputLines[i].trim();
				if (name.length && names.indexOf(name) === -1) { //distinct names
					names.push(name);
				}
			}
			callback({'projects': names.sort()});
			return;
		}
		callback({'projects': []});
	});
};

tfsIssueTracker.listIssues = function (options, callback) {
	var fields = [
			'[Id]',
			'[' + this.options.fieldMapping.status + ']',
			'[' + this.options.fieldMapping.summary + ']',
			'[' + this.options.fieldMapping.description + ']'
		],
		query = 'SELECT  ' + fields.join(', ') +
			' FROM WorkItems' +
			' WHERE [System.TeamProject] = \'' + options.projectKey + '\' AND [Id] IN' +
			' (' + options.ids.join(',') + ')',
		command;

	query = query.replace(/\"/g, '\\"');
	command = 'tfpt query /collection:' + this.options.URL + ' /wiql:"' + query + '" /include:data';

	this.logger.info(command);

	exec(command, function (error, stdout, stderr) {
		if (error) {
			tfsIssueTracker.eventEmitter.emit('trackerError', ['Error getting issue details:', options, error, stderr]);
		} else {
			callback({'issues': parseTfsQueryResponse(stdout)});
		}
	});
};

tfsIssueTracker.initialize = function () {
	if (!this.logger) {
		this.logger = console;
	}
	if (this.eventEmitter) {
		this.eventEmitter.emit('trackerInitialized');
	}
};
