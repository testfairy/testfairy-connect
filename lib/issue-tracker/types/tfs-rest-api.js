'use strict';

var httpntlm = require('httpntlm');
var HtmlEntities = require('html-entities').XmlEntities;

var tfsRestApiIssueTracker = {

	logger: null,
	eventEmitted: null,
	options: null,

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

		console.log("method " + method + " url " + url);

		var func = httpntlm[method];
		func(params, function(err, res) {
			//console.log("Error: " + err);
			//console.log("Res: " + JSON.stringify(res));
			//console.log("");

			var body = JSON.parse(res.body);
			callback(body);
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
		this.get(url, function(body) {

			var list = body.value;

			var projects = [];
			for (var i=0; i<list.length; i++) {
				projects.push(list[i].name);
			}

			callback({projects: projects});
		});
	},

	formatDescription: function(body)
	{
		body = body.replace(/\n/g, "<br />");
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

		console.log("XX " + JSON.stringify(options));
		console.log("X2X " + JSON.stringify(this.options));

		var workitemType = this.options.workitemType;
		console.log("YY " + workitemType);

		var entities = new HtmlEntities();

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
		this.patch(url, JSON.stringify(body), function(res) {
			console.log("ZZ " + JSON.stringify(res));
			console.log("Create a new issue with id " + res.id);

			var projectUrl = tfsRestApiIssueTracker.options.URL + "/" + encodeURIComponent(options.projectKey);
			var workitemUrl = projectUrl + "/_workitems?id=" + res.id + "&_a=edit";
			console.log("Work item is available at " + workitemUrl);

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

		/*
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
		*/
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
