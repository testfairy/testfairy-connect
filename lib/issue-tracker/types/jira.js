'use strict';
var JiraApi = require('jira-client');
var url = require('url');
var jiraIssueTracker = {};
var fs = require('fs-extra');
var extend = require('extend');

module.exports = jiraIssueTracker;

jiraIssueTracker.eventEmitter = null;

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
			this.options.oauth.consumer_secret = this.options.oauth.private_key_path //"backwards" compatibility - when key file was referenced
				? fs.readFileSync(this.options.oauth.private_key_path.replace('~', process.env.HOME), "utf8")
				: this.options.oauth.private_key;
			options.oauth = this.options.oauth;
		}

		this.jira = new JiraApi(options);
		this.jira.createMeta = function (projectKey) {
			return this.doRequest(this.makeRequestHeader(this.makeUri({
				pathname: '/issue/createmeta?expand=projects.issuetypes.fields&projectKeys=' + projectKey
			})));
		};

		this.listProjects(function (res) {
			if (res.projects.length > 0) {
				jiraIssueTracker.eventEmitter.emit('trackerInitialized');
			} else {
				jiraIssueTracker.eventEmitter.emit('trackerError', ["Projects list is empty, Please check your configuration, or user permissions", res.error]);
			}
		});
	}
};

jiraIssueTracker.createMeta = function (callback) {
	var uri = this.jira.makeUri({pathname: '/issue/createmeta?expand=projects.issuetypes.fields'});
	this.jira.doRequest(this.jira.makeRequestHeader(uri)).then(function (result) {
		callback({projects: result.projects});
	});
};

jiraIssueTracker.createIssue = function (options, callback) {

	var issue = {
		'fields': extend({
			'project': {
				'key': options.projectKey
			},
			'summary': options.summary,
			'description': options.description,
			'issuetype': {
				'id': options.issueTypeId
			}
		}, options.customFields, this.customFields[options.projectKey])
	};

	this.jira.addNewIssue(issue)
		.then(function (response) {
			var data = {
				'issueKey': response.key,
				'issueId': response.id,
				'projectURL': jiraIssueTracker.options.URL + '/' + options.projectKey,
				'issueURL': jiraIssueTracker.options.URL + '/browse/' + response.key
			};

			if ("token" in options) {
				data.token = options.token;
			}

			callback(data);
		})
		.catch(function (error) {
			jiraIssueTracker.eventEmitter.emit('trackerError', ['Error creating issue:', options, error]);
		});
};

jiraIssueTracker.listProjects = function (callback) {

	var i;
	this.jira.listProjects()
		.then(function (projects) {
			var names = [];
			for (i = 0; i < projects.length; i++) {
				names.push(projects[i].key);
			}
			callback({'projects': names});
		})
		.catch(function (error) {
			callback({'projects': [], 'error': error.cause});
		});
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
		.then(function (response) {
			callback({'issues': mapJiraIssuesResponse(response)});
		})
		.catch(function (error) {
			jiraIssueTracker.eventEmitter.emit('trackerError', ['Error listing issues:', options, error]);
		});
};

jiraIssueTracker.createMeta = function (options, callback) {

	this.jira.createMeta(options.projectKey)
		.then(function (response) {
			callback({'createmeta': response});
		})
		.catch(function (error) {
			jiraIssueTracker.eventEmitter.emit('trackerError', ['Error fetching createmeta:', options, error]);
		});
};

jiraIssueTracker.prepareCustomFields = function () {
	var i, j, projectsCount, fieldsCount, project, field;
	this.customFields = {};
	if (jiraIssueTracker.options.customFields) {
		projectsCount = jiraIssueTracker.options.customFields.length;
		for (i = 0; i < projectsCount; i++) {
			project = jiraIssueTracker.options.customFields[i];
			this.customFields[project.projectKey] = {};
			fieldsCount = project.fields.length;
			for (j = 0; j < fieldsCount; j++) {
				field = project.fields[j];
				this.customFields[project.projectKey][field.key] = field.defaultValue;
			}
		}
	}
};

jiraIssueTracker.initialize = function () {
	//initialize API
	this.prepareCustomFields();
	this.prepareApi();
};

