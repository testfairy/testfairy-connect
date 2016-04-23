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
        this.loadBugTypeId(function (error) {
            if (error) {
                console.warn(error);
            }
        });
    }
};

jiraIssueTracker.loadBugTypeId = function (callback) {
    this.jira.listIssueTypes(function (error, result) {
        var i;
        if (result) {
            for (i in result) {
                if (result.hasOwnProperty(i)) {
                    if (result[i].name.toLowerCase() === jiraIssueTracker.options.issueType.toLowerCase()) {
                        jiraIssueTracker.bugTypeId = result[i].id;
                        jiraIssueTracker.eventEmitter.emit('trackerInitialized');
                        return;
                    }
                }
            }
            callback('"' + jiraIssueTracker.options.issueType + '" issue type not found.');
        } else {
            callback(error);
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
    var issue = {
        'fields': {
            'description': options.description
        }
    };

    this.jira.updateIssue(options.issueKey, issue, function (error, response) {
        if (error) {
            jiraIssueTracker.logger.error('Error updating issue:', options, error);
        } else {
            var data = {
                'issueKey': response.key
            };
            callback(data);
        }
    });
};

jiraIssueTracker.listProjects = function (callback) {
    callback({'projects': this.options.projects});
};

function mapJiraIssuesResponse(jiraResponse) {
    var results = [],
        result,
        issue,
        i;
    for (i in jiraResponse.issues) {
        if (jiraResponse.issues.hasOwnProperty(i)) {
            issue = jiraResponse.issues[i];
            result = {
                'issueKey': issue.key,
                'status': issue.fields.status.name,
                'summary': issue.fields.summary,
                'description': issue.fields.description
            };
            results.push(result);
        }
    }
    return results;
}
jiraIssueTracker.listIssues = function (options, callback) {
    var jql = 'key in (' + options.ids.join(',') + ')';

    this.jira.searchJira(jql, {}, function (error, response) {
        if (error) {
            jiraIssueTracker.logger.error('Error updating issue:', options, error);
        } else {
            callback({'issues': mapJiraIssuesResponse(response)});
        }
    });
};

jiraIssueTracker.initialize = function () {
    //initialize API
    this.prepareApi();
};
