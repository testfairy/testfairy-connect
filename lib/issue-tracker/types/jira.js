'use strict';
var JiraApi = require('jira').JiraApi;
var exec = require('child_process').exec;
var url = require('url');
var jiraIssueTracker = {};

module.exports = jiraIssueTracker;

function parseOptions(options) {
    var parsedOptions;
    parsedOptions = url.parse();

    return parsedOptions;
}

jiraIssueTracker.prepareApi = function () {
    if (!this.jira) {
        var options = url.parse(this.options.URL),
            base = options.path.replace(/(^\/)|(\/^)/g, ''),
            protocol = options.protocol.replace(':', '');
        this.jira = new JiraApi(protocol, options.hostname, options.port, this.options.username, this.options.password, '2', true, this.options.strictSSL, this.options.oauth, base);
        this.loadBugTypeId();
    }
};

jiraIssueTracker.loadBugTypeId = function (callback) {
    this.jira.listIssueTypes(function (error, result) {
        var i;
        if (result) {
            for (i in result) {
                if (result.hasOwnProperty(i)) {
                    if (result[i].name.toLowerCase() == jiraIssueTracker.options.issueType.toLowerCase()) {
                        jiraIssueTracker.bugTypeId = result[i].id;
                        jiraIssueTracker.eventEmitter.emit('trackerInitialized');
                        return;
                    }
                }
            }
            callback('"' + jiraIssueTracker.options.issueType + '" issue type not found.', null);
        } else {
            callback(error, null);
        }
    });
};

jiraIssueTracker.createIssue = function (options, callback) {

    var issue = {
        'fields': {
            'project': {
                'key': options.projectKey
            },
            'summary': options.summary,
            'description': options.description,
            'issuetype': {
                'id': jiraIssueTracker.bugTypeId
            }
        }
    };

    this.jira.addNewIssue(issue, function (error, response) {
        if (error) {
            jiraIssueTracker.logger.error('Error creating issue:', options, error);
        } else {
            var data = {
                'issueKey': response.key,
                'issueId': response.id,
                'projectURL': jiraIssueTracker.options.URL + '/' + options.projectKey,
                'issueURL': jiraIssueTracker.options.URL + '/browse/' + response.key
            };
            callback(data);
        }
    });
};

jiraIssueTracker.updateIssue = function (options, callback) {
    console.log('not implemented yet');
    //var issue = {
    //    'fields': {
    //        'project': {
    //            'key': options.projectKey
    //        },
    //        'summary': options.summary,
    //        'description': options.description,
    //        'issuetype': {
    //            'id': jiraIssueTracker.bugTypeId
    //        }
    //    }
    //};
    //
    //this.jira.updateIssue(issue, function (error, response) {
    //    if (error) {
    //        jiraIssueTracker.logger.error('Error updating issue:', options, error);
    //    } else {
    //        var data = {
    //            'issueKey': response.key,
    //        };
    //        callback(data);
    //    }
    //});
};

jiraIssueTracker.listProjects = function (callback) {
    callback({'projects': this.options.projects});
};

jiraIssueTracker.listIssues = function (options, callback) {
    console.log('not implemented yet');
    //var fields = [
    //        '[Id]',
    //        '[' + this.options.fieldMapping.status + ']',
    //        '[' + this.options.fieldMapping.summary + ']',
    //        '[' + this.options.fieldMapping.description + ']'
    //    ],
    //    query = 'SELECT  ' + fields.join(', ') +
    //        ' FROM WorkItems' +
    //        ' WHERE [System.TeamProject] = \'' + options.projectKey + '\' AND [Id] IN' +
    //        ' (' + options.ids.join(',') + ')',
    //    command;
    //
    //query = query.replace(/\"/g, '\\"');
    //command = 'tfpt query /collection:' + this.options.URL + ' /wiql:"' + query + '" /include:data';
    //
    //this.logger.info(command);
    //
    //exec(command, function (error, stdout, stderr) {
    //    if (error) {
    //        jiraIssueTracker.logger.error('Error getting issue details:', options, error, stderr);
    //    } else {
    //        callback({'issues': parseTfsQueryResponse(stdout)});
    //    }
    //});
};

jiraIssueTracker.test = function (options, callback) {
    callback({'message': 'TestFairy Connect connected!'});
};

jiraIssueTracker.initialize = function () {
    //initialize API
    this.prepareApi();
};
