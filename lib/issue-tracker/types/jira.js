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
		const parsedUrl = url.parse(this.options.URL);
		const base = parsedUrl.path.replace(/(^\/)|(\/^)/g, '');
		const protocol = parsedUrl.protocol.replace(':', '');
		const options = {
			'host': parsedUrl.hostname,
			'protocol': protocol,
			'port': parsedUrl.port,
			'base': base,
			'username': this.options.username,
			'password': this.options.password,
			'strictSSL': this.options.strictSSL,
			timeout: 30000,
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
				pathname: '/issue/createmeta?expand=projects.issuetypes.fields&projectKeys=' + projectKey,
			})));
		};

		this.listProjects(function (res) {
			if (res.projects.length > 0) {
				jiraIssueTracker.eventEmitter.emit('trackerInitialized');
			} else {
				jiraIssueTracker.eventEmitter.emit('trackerError', ["Projects list is empty. Please check your configuration or user permissions", options, res.error]);
			}
		});
	}
};

/*
jiraIssueTracker.createMeta = function (callback) {
	var uri = this.jira.makeUri({pathname: '/issue/createmeta?expand=projects.issuetypes.fields'});
	this.jira.doRequest(this.jira.makeRequestHeader(uri)).then(function (result) {
		callback({projects: result.projects});
	});
};
*/

jiraIssueTracker.createIssue = function (options, callback) {

	const issue = {
		'fields': extend({
			'project': {
				'key': options.projectKey,
			},
			'summary': options.summary,
			'description': options.description,
			'issuetype': {
				'id': options.issueTypeId,
			}
		}, options.customFields, this.customFields[options.projectKey])
	};

	console.log("Requesting addNewIssue from JIRA for project " + options.projectKey + " and summary " + options.summary);
	this.jira.addNewIssue(issue)
		.then(function (response) {
			const data = {
				'issueKey': response.key,
				'issueId': response.id,
				'projectURL': jiraIssueTracker.options.URL + '/' + options.projectKey,
				'issueURL': jiraIssueTracker.options.URL + '/browse/' + response.key,
			};

			if ("token" in options) {
				data.token = options.token;
			}

			console.log("JIRA created issue " + response.key);
			callback(data);
		})
		.catch(function (error) {
			jiraIssueTracker.eventEmitter.emit('trackerError', ['Error creating issue', options, error]);
		});
};

jiraIssueTracker.listProjects = function (callback) {
	console.log("Requesting listProjects from JIRA");
	this.jira.listProjects()
		.then(function (projects) {
			const names = projects.map((project) => project.key);
			console.log("JIRA returned these projects: " + JSON.stringify(names));
			callback({'projects': names});
		})
		.catch(function (error) {
			console.log("JIRA returned an error: " + JSON.stringify(error));
			callback({'projects': [], 'error': error.cause});
			jiraIssueTracker.eventEmitter.emit('trackerError', ['Error listing projects', {}, error]);
		});
};

jiraIssueTracker.createMeta = function (options, callback) {
	console.log("Requesting createMeta from JIRA");
	this.jira.createMeta(options.projectKey)
		.then(function (response) {
			console.log("JIRA returned createMeta response of " + JSON.stringify(response).length + " bytes");;
			callback({'createmeta': response});
		})
		.catch(function (error) {
			jiraIssueTracker.eventEmitter.emit('trackerError', ['Error fetching createmeta', options, error]);
		});
};

jiraIssueTracker.prepareCustomFields = function () {
	this.customFields = {};
	if (jiraIssueTracker.options.customFields) {
		const projectsCount = jiraIssueTracker.options.customFields.length;
		for (let i = 0; i < projectsCount; i++) {
			const project = jiraIssueTracker.options.customFields[i];
			this.customFields[project.projectKey] = {};
			const fieldsCount = project.fields.length;
			for (let j = 0; j < fieldsCount; j++) {
				const field = project.fields[j];
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

