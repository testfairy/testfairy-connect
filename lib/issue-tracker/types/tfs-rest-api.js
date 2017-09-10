'use strict';

var httpntlm = require('httpntlm');

var tfsRestApiIssueTracker = {

	logger: null,
	eventEmitted: null,
	options: null,

	/**
	 * Fetch a url using method and body. Will call back on callback(body, error).
	 *
	 * @param method
	 * @param url
	 * @param body
	 * @param callback
	 */
	request: function(method, url, body, callback) {

		var params = {
			url: url,
			username: this.options.username,
			password: this.options.password
		};

		if (body) {
			params.body = body;
		}

		if (method == "patch") {
			params.headers = {
				'Content-Type': 'application/json-patch+json'
			}
		}

		var func = httpntlm[method];
		func(params, function(err, res) {

			// console.log("Error: " + JSON.stringify(err));
			// console.log("Res: " + JSON.stringify(res));
			// console.log("");

			var body = null;
			if (err == null) {
				try {
					body = JSON.parse(res.body);
				} catch (exception) {
					// TFS returns html upon an error, not a json
					tfsRestApiIssueTracker.logger.log("Could not parse: " + body);

					// switch between body and error
					body = null;
					err = "Failed fetching url " + url + " using method " + method;
				}
			}

			callback(body, err);
		});
	},

	get: function(url, callback) {
		this.request("get", url, null, callback)
	},

	patch: function(url, body, callback) {
		this.request("patch", url, body, callback);
	},

	listIssues: function(options, callback) {
		console.dir(options);
	},

	listProjects: function(callback) {

		var url = this.options.URL + "/_apis/projects?api-version=1.0";
		this.get(url, function(body, error) {

			var list = body.value;

			var projects = [];
			for (var i=0; i<list.length; i++) {
				projects.push(list[i].name);
			}

			callback({projects: projects});
		});
	},

	/**
	 * Reformat text and attachments to html.
	 *
	 * We receive attachments as JIRA markups !image|options!, we need to convert these
	 * to html image.
	 *
	 * @param body
	 * @return string
	 */
	formatDescription: function(body)
	{
		// change \n to <br />
		body = body.replace(/\n/g, "<br />");

		// reformat image markups
		var re = /\\\\ (!)(https:[^|!]+)(|[^!]*)?(!)/g;
		body = body.replace(re, '<br /><img src="$2" style="width: 50%;" />');

		// turn session link to clickable in a blank target
		var re2 = /(https:\/\/[^/]+\/projects\/\d+)([^\s\n<>]+)/;
		body = body.replace(re2, '<a href="$1$2" target="_blank">$1$2</a>');

		return body;
	},

	/**
	 * Create a workitem in TFS
	 *
	 * options.projectKey = "My Demo Project"
	 * options.summary = "Workitem title"
	 * options.description = "Workitem body description"
	 *
	 * https://www.visualstudio.com/en-us/docs/integrate/api/wit/work-items#create-work-item
	 *
	 * @param options
	 * @param callback
	 */
	createIssue: function(options, callback) {

		// this.logger.log("createIssue with options=" + JSON.stringify(options) + " and this=" + JSON.stringify(this.options));

		var workitemType = this.options.workitemType;
		// this.logger.log("Using workitemType " + workitemType);

		// console.log("Body description: " + this.formatDescription(options.description));

		var body =
		[
			{
				"op": "add",
				"path": "/fields/System.Title",
				"value": options.summary
			},
			{
				"op": "add",
				"path": "/fields/System.Description",
				"value": this.formatDescription(options.description)
			}
		];

		var url = this.options.URL + "/" + encodeURIComponent(options.projectKey) + "/_apis/wit/workitems/$" + encodeURIComponent(workitemType) + "?api-version=1.0";
		this.patch(url, JSON.stringify(body), function(res, error) {

			if (error != null || res == null || typeof(res.id) == "undefined") {
				tfsRestApiIssueTracker.eventEmitter.emit('trackerError', ['Error creating issue:', options, error]);
				return;
			}

			tfsRestApiIssueTracker.logger.log("Created a new workteim with id " + res.id);

			var projectUrl = tfsRestApiIssueTracker.options.URL + "/" + encodeURIComponent(options.projectKey);
			var workitemUrl = projectUrl + "/_workitems?id=" + res.id + "&_a=edit";

			tfsRestApiIssueTracker.logger.log("Work item is available at " + workitemUrl);

			// prepare response for testfairy
			var data = {
				'issueKey': workitemType + " " + res.id,
				'issueId': res.id,
				'projectURL': projectUrl,
				'issueURL': workitemUrl
			};

			if ("token" in options) {
				data.token = options.token;
			}

			callback(data);
		});
	},

	initialize: function() {
		if (!this.logger) {
			this.logger = console;
		}

		if (this.eventEmitter) {
			this.eventEmitter.emit('trackerInitialized');
		}

		this.logger.info("TFS Rest API issue tracker initialized");
	}
};

module.exports = tfsRestApiIssueTracker;
