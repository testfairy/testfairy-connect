'use strict';

(function () {
	var inquirer = require('inquirer'),
		program = require('commander'),
		fs = require('fs-extra'),
		execSync = require('child_process').execSync,
		EventEmitter = require('events').EventEmitter,
		OAuth = require('oauth').OAuth,
		Promise = require('pinkie-promise'),
		validUrl = require('valid-url'),
		chalk = require('chalk'),
		defaults = {},
		oldConfig = null,
		userHome = process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH,
		configFile,
		requestToken = false,
		accessToken = false,
		requestTokenSecret = false,
		accessTokenSecret = false,
		consumer = false,
		jiraUrl = false,
		keypair = null,
		authorizationURL = '';

	program
		.option('-f, --file <path>', 'Set output config file path. Defaults to ' + userHome + '/.testfairy-connect/config.json')
		.parse(process.argv);
	configFile = program.file || (userHome + '/.testfairy-connect/config.json');

	console.log('Welcome to TestFairy Connect configuration wizard. (if will be saved into ' + configFile + ')');

	const dirname = require('path').dirname(configFile);
	if (!fs.pathExistsSync(dirname)) {
		try {
			fs.mkdirpSync(dirname);
		} catch (err) {
			console.error("Failed to create folder", err);
			process.exit(1);
		}
	}

	if (fs.existsSync(configFile)) {
		console.log('Using configuration defaults from ' + configFile);
		oldConfig = JSON.parse(fs.readFileSync(configFile));
		defaults = {
			'testfairyApiKey': oldConfig.testfairy.apiKey,
			'testfairyServerEndpoint': oldConfig.testfairy.URL,
			'URL': oldConfig.issueTracker.URL,
			'jiraAuthType': oldConfig.issueTracker.type === 'jira' ? (oldConfig.issueTracker.oauth ? 'oauth' : 'basic') : null,
			'workitemType': oldConfig.issueTracker.workitemType,
			'type': oldConfig.issueTracker.type,
			'oauth': oldConfig.issueTracker.oauth,
			'proxy': oldConfig.testfairy.proxy
		};

		if (oldConfig.issueTracker.username) {
			defaults.username = oldConfig.issueTracker.username;
			defaults.password = oldConfig.issueTracker.password;
		}
	}

	inquirer.prompt.prompts.password.prototype.getQuestion = function () {
		var message = chalk.green('?') + ' ' + chalk.bold(this.opt.message) + ' ';

		// Append the default if available, and if question isn't answered
		if (this.opt.default !== null && this.status !== 'answered') {
			message += chalk.dim('(*******) ');
		}

		return message;
	};

	function generateKeyPair() {
		execSync('openssl genrsa -out /tmp/jira_rsa 2048 &> /dev/null');
		execSync('openssl rsa -in /tmp/jira_rsa -pubout > /tmp/jira_rsa_pub');
		var result = {
			'public_key': fs.readFileSync('/tmp/jira_rsa_pub').toString(),
			'private_key': fs.readFileSync('/tmp/jira_rsa').toString()
		};

		fs.remove('/tmp/jira_rsa_pub');
		fs.remove('/tmp/jira_rsa');
		return result;
	}

	function buildTestFairyConfig(answers) {
		var config = {
			"timeout": 1000,
			"apiKey": answers.testfairyApiKey,
			"URL": answers.testfairyServerEndpoint,
		};

		if (answers.proxy) {
			config.proxy = answers.proxy;
		}

		return config;
	}

	function buildJiraConfig(answers, defaults) {
		var jiraConfig = {
			"type": "jira",
			"strictSSL": false
		};

		if (answers.jiraAuthType === 'basic') {
			jiraConfig.username = answers.username;
			jiraConfig.password = answers.password;
		} else {
			if (defaults.oauth) {
				jiraConfig.oauth = defaults.oauth;
			} else {
				if (keypair) {
					jiraConfig.oauth = keypair;
					jiraConfig.oauth.consumer_key = "testfairy-connect";
					jiraConfig.oauth.access_token = accessToken;
					jiraConfig.oauth.access_token_secret = accessTokenSecret;
				}
			}
		}

		jiraConfig.fieldMapping = {
			"status": "status",
			"summary": "summary",
			"description": "description"
		};

		return jiraConfig;
	}

	function answersToConfig(answers, defaults) {
		var config = {
			'testfairy': false,
			'issueTracker': false
		};
		config.testfairy = buildTestFairyConfig(answers);

		if (answers.type === 'jira') {
			config.issueTracker = buildJiraConfig(answers, defaults);
		}

		config.issueTracker.URL = answers.URL;
		return config;
	}

	function restart(answers) {
		console.info('Restarting...');
		return launch(answers);
	}

	function save(answers, defaults) {
		var config = answersToConfig(answers, defaults);
		console.info('Writing configuration to : ' + configFile);
		fs.writeFileSync(configFile, JSON.stringify(config, null, '\t'));
	}

	function nonEmpty(input) {
		return input.length > 0;
	}

	function launch(defaults) {
		var questions = [
			{
				type: 'input',
				name: 'testfairyServerEndpoint',
				message: 'Enter your TestFairy server endpoint? (e.g. https://acme.testfairy.com/connect)',
				filter: function (input) {
					const url = new URL(input);
					url.pathname = "/connect";
					return url.href;
				},
				validate: nonEmpty,
				default: defaults.testfairyServerEndpoint
			},
			{
				type: 'input',
				name: 'testfairyApiKey',
				message: 'What is your TestFairy API Key?',
				validate: nonEmpty,
				default: defaults.testfairyApiKey
			},
			{
				type: 'rawlist',
				name: 'type',
				default: ['jira', 'tfs'].indexOf(defaults.type),
				message: 'What kind of issue tracking system will you use with TestFairy Connect?',
				choices: [
					{'name': 'JIRA', 'value': 'jira'},
				]
			},
			{
				type: 'input',
				name: 'URL',
				message: 'What is your JIRA URL (e.g. https://example.atlassian.net or http://localhost:2990/jira)?',
				default: defaults.URL,
				filter: function (input) {
					return input.replace(new RegExp('[\/]+$'), '');
				},
				validate: function (input) {
					return !!validUrl.isUri(input);
				},
				when: function (answers) {
					return answers.type === 'jira';
				}
			},
			{
				type: 'rawlist',
				name: 'jiraAuthType',
				message: 'How shall TestFairy Connect authenticate to JIRA?',
				choices: ['basic', 'oauth'],
				default: ['basic', 'oauth'].indexOf(defaults.jiraAuthType),
				when: function (answers) {
					return answers.type === 'jira';
				}
			},
			{
				type: 'input',
				name: 'username',
				message: 'JIRA username:',
				validate: nonEmpty,
				default: defaults.username,
				when: function (answers) {
					return answers.jiraAuthType === 'basic';
				}
			},
			{
				type: 'password',
				name: 'password',
				default: defaults.password,
				message: 'JIRA password:',
				validate: nonEmpty,
				when: function (answers) {
					return answers.jiraAuthType === 'basic';
				}
			},
			{
				type: 'input',
				name: 'oauth_request_token',
				message: function (answers) {
					var applicationLinksUrl = jiraUrl + '/plugins/servlet/applinks/listApplicationLinks',
						message = '';
					keypair = generateKeyPair();
					message += '1. Open ' + applicationLinksUrl + ' in your browser.\n';
					message += '2. In "URL of Application" field type: ' + new URL(answers.testfairyServerEndpoint).origin + '\n';
					message += '3. Click on "Create new link" button.\n';
					message += '4. In "Configure Application URL" dialog click "Continue" button.\n';
					message += '5. In "Link applications" dialog enter these values:\n';
					message += '   Application Name: TestFairy Connect\n';
					message += '   Application Type: Generic Application\n';
					message += '   Service Provider Name: TestFairy\n';
					message += '   Consumer key: testfairy-connect\n';
					message += '   Shared Secret: secret\n';
					message += '   Request Token URL: /plugins/servlet/oauth/request-token\n';
					message += '   Access Token URL: /plugins/servlet/oauth/access-token\n';
					message += '   Authorize URL: /plugins/servlet/oauth/authorize\n';
					message += '   Create incoming link: Checked!\n';
					message += '\n';
					message += '6. Click "Continue" button.\n';
					message += '7. In "Incoming Authentication" dialog enter these values:\n';
					message += '   Consumer Key: testfairy-connect\n';
					message += '   Consumer Name: TestFairy Connect\n';
					message += '   Public Key: \n' + keypair.public_key + '\n';
					message += '\n';
					message += '8. Make sure that application link is successfully created.\n';
					message += '9. Type "yes" here when done.';
					return message;
				},
				validate: function (input) {
					if (('' + input).trim().toLowerCase() !== 'yes') {
						return false;
					}
					return new Promise(function (resolve, reject) {
						consumer = new OAuth(
							jiraUrl + "/plugins/servlet/oauth/request-token",
							jiraUrl + "/plugins/servlet/oauth/access-token",
							'testfairy-connect',
							keypair.private_key,
							"1.0",
							"https://app.testfairy.com/connect/oauth/done/",
							"RSA-SHA1",
							null,
							{
								"Accept": "application/json",
								"Connection": "close",
								"User-Agent": "Node authentication",
								"Content-Type": "application/json"
							}
						);
						consumer.getOAuthRequestToken(
							function (error, oauthToken, oauthTokenSecret, results) {
								if (error) {
									console.error('\n');
									console.error(error + error.stack);
									console.error('\n');
									resolve(false);
								} else {
									requestToken = oauthToken;
									requestTokenSecret = oauthTokenSecret;
									authorizationURL = jiraUrl + '/plugins/servlet/oauth/authorize?oauth_token=' + requestToken;
									console.info(authorizationURL);
									resolve(true);
								}
							}
						);
					});
				},
				when: function (answers) {
					jiraUrl = answers.URL;
					return answers.jiraAuthType === 'oauth' && !defaults.oauth && !keypair;
				}
			},
			{
				type: 'input',
				name: 'oauth_token',
				message: function (answers) {
					return 'Please allow TestFairy Connect access to your JIRA on this URL: \n' + authorizationURL + '\n' +
						'Upon successful integration, copy the provided oauth_verifier, and paste it here: ';
				},
				validate: function (input) {
					return new Promise(function (resolve, reject) {
						consumer.getOAuthAccessToken(
							requestToken,
							requestTokenSecret,
							input.trim(),
							function (error, oauthAccessToken, oauthAccessTokenSecret, results) {
								if (error) {
									console.error('Error happened');
									resolve(false);
								} else {
									accessToken = oauthAccessToken;
									accessTokenSecret = oauthAccessTokenSecret;
									resolve(true);
								}
							}
						);
					});
				},
				when: function (answers) {
					return answers.jiraAuthType === 'oauth' && !defaults.oauth && !accessToken;
				}
			},
			{
				type: 'input',
				name: 'proxy',
				default: defaults.proxy,
				message: 'Please enter HTTP proxy server address, leave empty if none:',
				validate: function (input) {
					return input == "" || !!validUrl.isUri(input);
				}
			}
		];

		return inquirer.prompt(questions)
			.then((answers) => console.dir(answers))
			.then(checkConnection)
			.then(launchActionPrompt)
			.catch(function (e) {
				console.error(chalk.red(e.message));
				console.error(e.stackTrace || '');
			});
	}

	function checkConnection(answers) {
		return new Promise(function (resolve, reject) {

			//connect to issue tracker and
			var config = answersToConfig(answers, defaults);
			console.log(chalk.green("Attempting a connection to " + config.issueTracker.URL));

			var issueTracker = require('./lib/issue-tracker')(config.issueTracker);

			var eventEmitter = new EventEmitter();
			issueTracker.setEventEmitter(eventEmitter);

			issueTracker.initialize();
			issueTracker.listProjects(function (result) {
				if (result.projects.length > 0) {
					console.error(chalk.green('Successfully connected to issue tracker.'));
				} else {
					console.log("This is what we got from the server:");
					console.log(result);
					console.error(chalk.red('Could not connect to issue tracker. Please check your settings.'));
				}
				resolve(answers);
			});
		});
	}

	function launchActionPrompt(answers) {
		return inquirer.prompt([
			{
				type: 'confirm',
				name: 'save',
				message: 'Configuration complete, save to file?',
				default: true
			}
		]).then(function (actionAnswer) {
			if (actionAnswer.save) {
				save(answers, defaults);
			} else {
				answers.oauth = (keypair ? false : defaults.oauth); //pass on old oauth configuration unless we have a new key
				restart(answers);
			}
		});
	}

	launch(defaults);

}());
