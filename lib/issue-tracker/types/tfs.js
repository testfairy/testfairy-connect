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
            fields.push(mapping[key] + '=' + data[key]);
        }
    }

    return fields.join(';');
}

tfsIssueTracker.createIssue = function (options, callback) {
    var command = 'tfpt workitem /new ' + options.projectKey + '\\Bug' +
        ' /fields:"' + buildFieldsString(options) + '"' +
        ' /collection:"' + this.options.URL + '"';
    console.log(command);
    exec(command, function (error, stdout) {
        if (error) {
            console.error('Error creating issue:', options, error);
        } else {
            var data = parseTfsCreateItemResponse(stdout);
            data.issueId = options.issueId;
            callback({'data': data});
        }
    });
};

tfsIssueTracker.updateIssue = function (options, callback) {
    var command = 'tfpt workitem /update ' + options.issueKey +
        ' /fields:"' + buildFieldsString(options) + '"' +
        ' /collection:"' + this.options.URL + '"';
    console.log(command);
    exec(command, function (error, stdout, stderr) {
        //parse stdout
        if (error) {
            console.error('Error updating issue:', options, error);
        } else if (stdout.toString().indexOf('updated') < 0) {
            console.error('Error updating issue:', options, stdout, stderr);
        } else {
            //issueKey not necessarily needed - action will know both issueKey and issueId
            callback({'data': {'issueKey': options.issueKey}});
        }
    });
};

tfsIssueTracker.listProjects = function (callback) {
    callback({'data': {'projects': this.options.projects}});
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
        command = 'tfpt query /collection:' + this.options.URL + ' /wiql:"' + query + '" /include:data';

    console.log(command);

    exec(command, function (error, stdout) {
        //parse stdout
        console.log(stdout);
        callback({'data': {'issues': parseTfsQueryResponse(stdout)}});
    });
};
