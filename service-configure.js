/**
 * Pizza delivery prompt example
 * run example by writing `node pizza.js` in your console
 */

'use strict';

(function () {
    var inquirer = require('inquirer'),
        program = require('commander'),
        fs = require('fs-extra'),
        execSync = require('child_process').execSync,
        OAuth = require('oauth').OAuth,
        Promise = require('pinkie-promise'),
        defaults = {},
        oldConfig = null,
        userHome = process.env.HOME || process.env.HOMEDRIVE + process.env.HOMEPATH,
        outputFile,
        chalk = require('chalk');

    program
        .option('-f, --outputFile <path>', 'Set output config file path. Defaults to ' + userHome + '/.testfairy-connect/config.json')
        .parse(process.argv);
    outputFile = program.outputFile || (userHome + '/.testfairy-connect/config.json');

    if (fs.existsSync(outputFile)) {
        console.log('Using configuration defaults from ' + outputFile);
        oldConfig = JSON.parse(fs.readFileSync(outputFile));
        defaults = {
            'testfairyApiKey': oldConfig.testfairy.apiKey,
            'URL': oldConfig.issueTracker.URL,
            'jiraAuthType': oldConfig.issueTracker.type === 'jira' ? (oldConfig.issueTracker.oauth ? 'oauth' : 'basic') : null,
            'issueType': oldConfig.issueTracker.issueType,
            'workitemType': oldConfig.issueTracker.workitemType,
            'type': oldConfig.issueTracker.type
        };
        if (oldConfig.issueTracker.username) {
            defaults.username = oldConfig.issueTracker.username;
            defaults.password = oldConfig.issueTracker.password;
        }
    }

    inquirer.prompt.prompts.password.prototype.getQuestion = function () {
        var message = chalk.green('?') + ' ' + chalk.bold(this.opt.message) + ' ';

        // Append the default if available, and if question isn't answered
        if (this.opt.default != null && this.status !== 'answered') {
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
        return {
            "timeout": 1000,
            "apiKey": answers.testfairyApiKey,
            "URL": (oldConfig && oldConfig.testfairy.URL) || "https://app.testfairy.com/connect"
        };
    }

    function buildJiraConfig(answers) {
        var jiraConfig = {
            "type": "jira",
            "issueType": answers.issueType,
            "strictSSL": false
        };
        if (answers.jiraAuthType === 'basic') {
            jiraConfig.username = answers.username;
            jiraConfig.password = answers.password;
        } else {
            if (oldConfig && oldConfig.issueTracker.oauth) {
                //keep old oauth config
                jiraConfig.oauth = oldConfig.issueTracker.oauth;
            } else {
                jiraConfig.oauth = answers.oauth_keypair;
                jiraConfig.oauth.consumer_key = "testfairy-connect";
                jiraConfig.oauth.access_token = answers.oauth_token.access_token;
                jiraConfig.oauth.access_token_secret = answers.oauth_token.access_token_secret;
            }
        }
        jiraConfig.fieldMapping = {
            "status": "status",
            "summary": "summary",
            "description": "description"
        };
        return jiraConfig;
    }

    function buildTFSConfig(answers) {
        var tfsConfig = {
            "type": "tfs",
            "workitemType": answers.workitemType
        };

        if (answers.workitemType === 'Bug') {
            tfsConfig.fieldMapping = {
                "status": "State",
                "summary": "Title",
                "description": "Repro Steps"
            };
        }
        if (answers.workitemType === 'Task' || answers.workitemType === 'User Story') {
            tfsConfig.fieldMapping = {
                "status": "State",
                "summary": "Title",
                "description": "Description"
            };
        }

        return tfsConfig;
    }

    console.log('Welcome to TestFairy Connect configuration wizard.');

    var requestToken = false;
    var requestTokenSecret = false;
    var consumer = false;
    var jiraUrl = false;
    var keypair = {};
    var authorizationURL = '';

    var questions = [
        {
            type: 'input',
            name: 'testfairyApiKey',
            message: 'What is your TestFairy API Key?',
            default: defaults.testfairyApiKey
        },
        {
            type: 'list',
            name: 'type',
            default: defaults.type,
            message: 'What kind of issue tracking system will you use with TestFairy Connect?',
            choices: [
                {'name': 'JIRA', 'value': 'jira'},
                {'name': 'TFS', 'value': 'tfs'}
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
            when: function (answers) {
                return answers.type === 'jira';
            }
        },
        {
            type: 'list',
            name: 'jiraAuthType',
            message: 'How shall TestFairy Connect authenticate to JIRA?',
            choices: ['basic', 'oauth'],
            default: defaults.jiraAuthType || 'basic',
            when: function (answers) {
                return answers.type === 'jira';
            }
        },
        {
            type: 'input',
            name: 'issueType',
            message: 'What is the type of JIRA issues to be created using TestFairy Connect?',
            default: defaults.issueType || 'Bug',
            when: function (answers) {
                return answers.type === 'jira';
            }
        },
        {
            type: 'input',
            name: 'username',
            message: 'JIRA username:',
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
                message += '2. In "Application field type: http://app.testfairy.com\n';
                message += '3. Click on "Create new link" button.\n';
                message += '4. In "Configure Application URL" dialog click "Continue" button.\n';
                message += '5. In "Link applications" dialog enter these value:\n';
                message += 'Application Name: TestFairy Connect\n';
                message += 'Application Type: Generic Application\n';
                message += 'Service Provider Name: TestFairy\n';
                message += 'Consumer key: testfairy-connect\n';
                message += 'Shared Secret: secret\n';
                message += 'Request Token URL: /plugins/servlet/oauth/request-token\n';
                message += 'Access Token URL: /plugins/servlet/oauth/access-token\n';
                message += 'Authorize URL: /plugins/servlet/oauth/authorize\n';
                message += 'Create incoming link: Checked!\n';
                message += '\n';
                message += '6. Click "Continue" button.\n';
                message += '7. In "Incoming Authentication" dialog enter these values:\n';
                message += 'Consumer Key: testfairy-connect\n';
                message += 'Consumer Name: TestFairy Connect\n';
                message += 'Public Key: \n' + keypair.public_key + '\n';
                message += '8. Make sure that application link is successfully created.';
                message += '9. Type "yes" here when done.';
                return message;
            },
            validate: function (input) {
                if (('' + input).toLowerCase() !== 'yes') {
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
                                reject(error + error.stack);
                            } else {
                                requestToken = oauthToken;
                                requestTokenSecret = oauthTokenSecret;
                                authorizationURL = jiraUrl + '/plugins/servlet/oauth/authorize?oauth_token=' + requestToken;
                                resolve(input);
                            }
                        }
                    );
                });
            },
            when: function (answers) {
                jiraUrl = answers.URL;
                return answers.jiraAuthType === 'oauth' && !(oldConfig && oldConfig.issueTracker.oauth);
            }
        },
        {
            type: 'input',
            name: 'oauth_token',
            message: function (answers) {
                return 'Please allow TestFairy Connect access to your JIRA on this URL: \n' + authorizationURL + '\n' +
                    'Upon successful integration, copy the provided oauth_verifier, and paste it here: ';
            },
            filter: function (input) {
                return new Promise(function (resolve, reject) {
                    consumer.getOAuthAccessToken(
                        requestToken,
                        requestTokenSecret,
                        input.trim(),
                        function (error, oauthAccessToken, oauthAccessTokenSecret, results) {
                            if (error) {
                                reject(error);
                            } else {
                                resolve({
                                    'access_token': oauthAccessToken,
                                    'access_token_secret': oauthAccessTokenSecret
                                });
                            }
                        }
                    );
                });
            },
            when: function (answers) {
                return answers.jiraAuthType === 'oauth' && !(oldConfig && oldConfig.issueTracker.oauth);
            }
        },
        {
            type: 'input',
            name: 'URL',
            default: defaults.URL,
            message: 'What is your TFS Collection URL (e.g. http://localhost:8080/tfs/DefaultCollection)?',
            filter: function (input) {
                return input.replace(new RegExp('[\/]+$'), '');
            },
            when: function (answers) {
                return answers.type === 'tfs';
            }
        },
        {
            type: 'list',
            name: 'workitemType',
            message: 'What is the type of TFS workitems to be created using TestFairy Connect?',
            choices: ['Bug', 'Task', 'User Story'],
            default: defaults.workitemType || 'Bug',
            when: function (answers) {
                return answers.type === 'tfs';
            }
        }
    ];

    inquirer.prompt(questions).then(function (answers) {
        var config = {
            'testfairy': false,
            'issueTracker': false
        };

        config.testfairy = buildTestFairyConfig(answers);

        if (answers.type === 'jira') {
            config.issueTracker = buildJiraConfig(answers);
        } else if (answers.type === 'tfs') {
            config.issueTracker = buildTFSConfig(answers);
        }
        config.issueTracker.URL = answers.URL;
        console.info('SUCCESS!');
        if (oldConfig && oldConfig.issueTracker.projects) {
            config.issueTracker.projects = oldConfig.issueTracker.projects;
            console.info('Projects configured: ' + config.issueTracker.projects);
        } else {
            console.info('Configuration complete. Please do not forget to manually edit list of projects to be exposed to TestFairy.');
            console.info('For your convenience, we are providing 2 placeholder projects (["PROJECT1", "PROJECT2"]) to this configuration.');
            console.info('Please make sure that you edit this list to contain the projects that exist on your issue tracker.');
            config.issueTracker.projects = ["PROJECT1", "PROJECT2"];
        }
        console.info('Writing configuration to : ' + outputFile);
        fs.writeFileSync(outputFile, JSON.stringify(config, null, '\t'));
    }).catch(function (e) {
        console.error(e.message);
    });
}());
