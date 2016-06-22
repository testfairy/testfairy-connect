'use strict';
var JiraApi = require('jira-client');
var url = require('url');
var jiraIssueTracker = {};
var fs = require('fs-extra');

module.exports = jiraIssueTracker;

jiraIssueTracker.prepareApi = function () {
    if (!this.jira) {
        var parsedUrl = url.parse(this.options.URL),
            base = parsedUrl.path.replace(/(^\/)|(\/^)/g, ''),
            protocol = parsedUrl.protocol.replace(':', ''),
            options = {
                'host': parsedUrl.hostname,
                'protocol': protocol,
                'port': parsedUrl.port,
                'base': base,
                'username': this.options.username,
                'password': this.options.password,
                'strictSSL': this.options.strictSSL
            };

        if (this.options.oauth) {
            this.options.oauth.consumer_secret = fs.readFileSync(this.options.oauth.private_key_path.replace('~', process.env.HOME), "utf8");
            options.oauth = this.options.oauth;
        }
        this.jira = new JiraApi(options);
        this.loadBugTypeId();
    }
};

jiraIssueTracker.loadBugTypeId = function () {
    this.jira.listIssueTypes()
        .then(function (result) {
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
                jiraIssueTracker.logger.error('"' + jiraIssueTracker.options.issueType + '" issue type not found.');
                //fatal
                process.exit(2);
            }
        })
        .catch(function (error) {
            jiraIssueTracker.logger.error(error);
            //fatal
            process.exit(2);
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

    this.jira.addNewIssue(issue)
        .then(function (response) {
            var data = {
                'issueKey': response.key,
                'issueId': response.id,
                'projectURL': jiraIssueTracker.options.URL + '/' + options.projectKey,
                'issueURL': jiraIssueTracker.options.URL + '/browse/' + response.key
            };
            callback(data);
        })
        .catch(function (error) {
            jiraIssueTracker.logger.error('Error creating issue:', options, error);
        });
};

jiraIssueTracker.updateIssue = function (options, callback) {
    var issue = {
        'fields': {
            'description': options.description
        }
    };

    this.jira.updateIssue(options.issueKey, issue)
        .then(function (error, response) {
            var data = {
                'issueKey': response.key
            };
            callback(data);
        })
        .catch(function (error) {
            jiraIssueTracker.logger.error('Error updating issue:', options, error);
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

    this.jira.searchJira(jql, {})
        .then(function (error, response) {
            callback({'issues': mapJiraIssuesResponse(response)});
        })
        .catch(function (error) {
            jiraIssueTracker.logger.error('Error updating issue:', options, error);
        });
};

jiraIssueTracker.initialize = function () {
    //initialize API
    this.prepareApi();
};
