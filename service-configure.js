'use strict';

(function () {
	var inquirer = require('inquirer'),
		URL = require('url').URL,
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
		testfairyServerEndpoint = false,
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
		execSync('openssl genrsa -out /tmp/jira_rsa 2048 2>/dev/null 1>/dev/null');
		execSync('openssl rsa -in /tmp/jira_rsa -pubout 2>/dev/null 1>/tmp/jira_rsa_pub');
		const result = {
			'public_key': fs.readFileSync('/tmp/jira_rsa_pub').toString(),
			'private_key': fs.readFileSync('/tmp/jira_rsa').toString(),
		};

		fs.remove('/tmp/jira_rsa_pub');
		fs.remove('/tmp/jira_rsa');
		return result;
	}

	function buildTestFairyConfig(answers) {
		const config = {
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
		const jiraConfig = {
			"type": "jira",
			"strictSSL": true,
			"ca": null,
		};

		if (answers.ca) {
			jiraConfig.ca = answers.ca;
		}

		if (answers.jiraAuthType === 'basic') {
			jiraConfig.username = answers.username;
			jiraConfig.password = answers.password;
		} else {
			if (defaults.oauth) {
				jiraConfig.oauth = defaults.oauth;
			} else {
				if (keypair) {
					jiraConfig.oauth = {
						public_key: keypair.public_key,
						private_key: keypair.private_key,
						consumer_key: "testfairy-connect",
						access_token: accessToken,
						access_token_secret: accessTokenSecret,
					};
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
		const config = {
			'testfairy': false,
			'issueTracker': null,
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

	async function launch(defaults) {
		const questions = [
			{
				type: 'input',
				name: 'testfairyServerEndpoint',
				message: 'Enter your TestFairy server endpoint? (e.g. https://acme.testfairy.com)',
				filter: function (input) {
					const url = new URL(input);
					url.protocol = "https";
					url.pathname = "/connect";
					return url.href;
				},
				validate: nonEmpty,
				default: defaults.testfairyServerEndpoint
			},
			{
				type: 'password',
				name: 'testfairyApiKey',
				message: 'What is your TestFairy API Key?',
				validate: nonEmpty,
				default: defaults.testfairyApiKey
			},
			{
				type: 'rawlist',
				name: 'type',
				default: ['jira'].indexOf(defaults.type),
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
			/*
			{

				validate: function (input) {
					console.log("!!! " + input);
					const answer = ('' + input).trim().toLowerCase();
					if (answer !== 'yes') {
						return false;
					}

					return new Promise(function (resolve, reject) {
						console.log("\nPlease wait, trying to connect with OAuth...");
						const customHeaders = {
							"Accept": "application/json",
							"Connection": "close",
							"User-Agent": "Node authentication",
							"Content-Type": "application/json",
						};

						consumer = new OAuth(
							jiraUrl + "/plugins/servlet/oauth/request-token",
							jiraUrl + "/plugins/servlet/oauth/access-token",
							'testfairy-connect',
							keypair.private_key,
							"1.0",
							testfairyServerEndpoint + "/oauth/done/",
							"RSA-SHA1",
							null,
							customHeaders,
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
					testfairyServerEndpoint = answers.testfairyServerEndpoint;
					return answers.jiraAuthType === 'oauth' && !defaults.oauth;
				}
			},
			{
				type: 'input',
				name: 'oauth_token',
				message: function (answers) {
					return 'Please allow TestFairy Connect access to your JIRA on this URL: \n' + chalk.blue.underline(authorizationURL) + '\n' +
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
			*/
			{
				type: 'input',
				name: 'proxy',
				default: defaults.proxy,
				message: 'Please enter HTTP proxy server address, leave empty if none:',
				validate: function (input) {
					return input === "" || !!validUrl.isUri(input);
				}
			}
		];

		const answers = await inquirer.prompt(questions);
		await handleSelfSignedCerts(answers);
		await handleOauthConfiguration(answers);
		await checkConnectionTestFairy(answers);
		await checkConnectionIssueTracker(answers);
		await launchActionPrompt(answers);
		// .then(handleOauthConfiguration)
		// .then(checkConnectionTestFairy)
		// .then(checkConnectionIssueTracker)
		// .then(launchActionPrompt)
		// .catch(function (e) {
		// 	console.error(chalk.red("Configuration error"), e);
		// });
	}

	function handleSelfSignedCerts(answers) {
		return new Promise(async function(resolve, reject) {

			const url = new URL(answers.URL);
			if (url.host.endsWith(".atlassian.net")) {
				// this is a jira public cloud installation
				resolve(answers);
				return;
			}

			// this is an on-premise jira server installation
			const questions = [
				{
					type: 'rawlist',
					name: 'isSelfSigned',
					default: "No",
					message: 'This is a JIRA Server installation, are you using self-signed certificate?',
					choices: ['No', 'Yes'],
				},
				{
					type: "editor",
					name: "ca",
					default: '',
					message: 'Please paste your self-signed certificate in text-editor.',
					when: function(answers) {
						return answers.isSelfSigned === "Yes";
					},
					validate: function(str) {
						return str.indexOf("-----BEGIN CERTIFICATE-----") >= 0 && str.indexOf("-----END CERTIFICATE-----") >= 0;
					}
				}
			];

			const bunch = await inquirer.prompt(questions);
			if (bunch.isSelfSigned === "Yes") {
				answers.ca = bunch.ca;
			}

			resolve(answers);
		});
	}

	function getHelpForOauthConfiguration(answers) {
		const applicationLinksUrl = jiraUrl + '/plugins/servlet/applinks/listApplicationLinks';

		const message = [];
		message.push('');
		message.push('1. Open ' + chalk.blue.underline(applicationLinksUrl) + ' in your browser.');
		message.push('2. In "URL of Application" field type: ' + chalk.blue.underline(new URL(answers.testfairyServerEndpoint).origin));
		message.push('3. Click on ' + chalk.blue('"Create new link"') + ' button.');
		message.push('4. In "Configure Application URL" dialog click ' + chalk.blue('"Continue"') + ' button.');
		message.push('5. In "Link applications" dialog enter these values:');
		message.push('   Application Name: ' + chalk.blue.underline('TestFairy Connect'));
		message.push('   Application Type: ' + chalk.blue.underline('Generic Application'));
		message.push('   Service Provider Name: ' + chalk.blue.underline('TestFairy'));
		message.push('   Consumer key: ' + chalk.blue.underline('testfairy-connect'));
		message.push('   Shared Secret: ' + chalk.blue.underline('secret'));
		message.push('   Request Token URL: ' + chalk.blue.underline('/plugins/servlet/oauth/request-token'));
		message.push('   Access Token URL: ' + chalk.blue.underline('/plugins/servlet/oauth/access-token'));
		message.push('   Authorize URL: ' + chalk.blue.underline('/plugins/servlet/oauth/authorize'));
		message.push('   Create incoming link: Checked!');
		message.push('6. Click ' + chalk.blue('"Continue"') + ' button.');
		message.push('7. In "Incoming Authentication" dialog enter these values:');
		message.push('   Consumer Key: ' + chalk.blue.underline('testfairy-connect'));
		message.push('   Consumer Name: ' + chalk.blue.underline('TestFairy Connect'));
		message.push('   Public Key:');
		message.push(chalk.blue(keypair.public_key));
		message.push('');
		message.push('8. Make sure that application link is successfully created.');
		message.push('');
		return message.join("\n");
	}

	function getOauthAuthorizationUrl(answers) {
		return new Promise(function (resolve, reject) {

			console.log("\nPlease wait, trying to connect with OAuth...");

			const jiraUrl = answers.URL;

			const customHeaders = {
				"Accept": "application/json",
				"Connection": "close",
				"User-Agent": "Node authentication",
				"Content-Type": "application/json",
			};

			const consumer = new OAuth(
				jiraUrl + "/plugins/servlet/oauth/request-token",
				jiraUrl + "/plugins/servlet/oauth/access-token",
				'testfairy-connect',
				keypair.private_key,
				"1.0",
				testfairyServerEndpoint + "/oauth/done/",
				"RSA-SHA1",
				null,
				customHeaders,
			);

			consumer.getOAuthRequestToken(
				function (error, oauthToken, oauthTokenSecret, results) {
					if (error) {
						console.error('\n');
						console.error(error + error.stack);
						console.error('\n');
						resolve(answers);
					} else {
						requestToken = oauthToken;
						requestTokenSecret = oauthTokenSecret;
						authorizationURL = jiraUrl + '/plugins/servlet/oauth/authorize?oauth_token=' + requestToken;
						console.info(authorizationURL);
						resolve(answers);
					}
				}
			);
		});
	}

	function handleOauthConfiguration(answers) {
		return new Promise(function (resolve, reject) {
			if (answers.type === 'jira' && answers.jiraAuthType === 'oauth') {

				if (keypair == null) {
					keypair = generateKeyPair();
				}

				console.log(getHelpForOauthConfiguration(answers));

				const questions = [
					{
						name: 'confirm',
						type: 'confirm',
						message: 'Ready ?',
					}
				];

				inquirer.prompt(questions).then(resolve);
			} else {
				// not jira, or not jira+basic
				resolve(answers);
			}
		});
	}

	function checkConnectionTestFairy(answers) {
		return new Promise(function (resolve, reject) {
			const config = answersToConfig(answers, defaults);

			console.info("Attempting a connection to " + config.testfairy.URL);

			const testfairyService = require('./lib/testfairy-service')(config.testfairy, require('./logger')());
			testfairyService.getActions(function (result, error) {
				if (Array.isArray(result) && error === undefined) {
					console.info(chalk.green('Successfully connected to TestFairy Connect.'));

					resolve(answers);
				} else {
					// console.error(error);
					console.error(chalk.red('Could not connect to TestFairy endpoint. Please check your settings.'));
					resolve(answers);
				}
			});
		});
	}

	function checkConnectionIssueTracker(answers) {
		return new Promise(function (resolve, reject) {

			//connect to issue tracker and
			const config = answersToConfig(answers, defaults);
			console.log(chalk.green("Attempting a connection to " + config.issueTracker.URL));

			const issueTracker = require('./lib/issue-tracker')(config.issueTracker, require('./logger')());

			const eventEmitter = new EventEmitter();
			issueTracker.setEventEmitter(eventEmitter);

			issueTracker.initialize();
			issueTracker.listProjects(function (result) {
				if (result.projects.length > 0) {
					console.info(chalk.green('Successfully connected to issue tracker.'));
				} else {
					console.error(chalk.red('Could not connect to issue tracker. Please check your settings.'));
					console.error(chalk.red("Response from server: " + result.error));
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
