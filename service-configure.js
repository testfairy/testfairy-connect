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
        configFile,
        chalk = require('chalk'),
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

    if (fs.existsSync(configFile)) {
        console.log('Using configuration defaults from ' + configFile);
        oldConfig = JSON.parse(fs.readFileSync(configFile));
        defaults = {
            'testfairyApiKey': oldConfig.testfairy.apiKey,
            'URL': oldConfig.issueTracker.URL,
            'jiraAuthType': oldConfig.issueTracker.type === 'jira' ? (oldConfig.issueTracker.oauth ? 'oauth' : 'basic') : null,
            'issueType': oldConfig.issueTracker.issueType,
            'workitemType': oldConfig.issueTracker.workitemType,
            'type': oldConfig.issueTracker.type,
            'oauth': oldConfig.issueTracker.oauth
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
        return {
            "timeout": 1000,
            "apiKey": answers.testfairyApiKey,
            "URL": (oldConfig && oldConfig.testfairy.URL) || "https://app.testfairy.com/connect"
        };
    }

    function buildJiraConfig(answers, defaults) {
        var jiraConfig = {
            "type": "jira",
            "issueType": answers.issueType,
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

    function restart(answers) {
        console.info('Restarting...');
        launch(answers);
    }
    function save(answers, defaults) {
        var config = {
            'testfairy': false,
            'issueTracker': false
        };
        config.testfairy = buildTestFairyConfig(answers);

        if (answers.type === 'jira') {
            config.issueTracker = buildJiraConfig(answers, defaults);
        } else if (answers.type === 'tfs') {
            config.issueTracker = buildTFSConfig(answers);
        }
        config.issueTracker.URL = answers.URL;
        console.info(chalk.green('SUCCESS!'));
        console.info('Writing configuration to : ' + configFile);
        fs.writeFileSync(configFile, JSON.stringify(config, null, '\t'));
    }

    console.log('Welcome to TestFairy Connect configuration wizard.');

    function launch(defaults) {
        var questions = [
            {
                type: 'input',
                name: 'testfairyApiKey',
                message: 'What is your TestFairy API Key?',
                default: defaults.testfairyApiKey
            },
            {
                type: 'rawlist',
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
                type: 'rawlist',
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
                validate: function (input) {
                    return input.length > 0;
                },
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
                validate: function (input) {
                    return input.length > 0;
                },
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
                                    console.error(error + error.stack);
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
                                    accessToken = oauthAccessToken;
                                    accessTokenSecret = oauthAccessTokenSecret;
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
                    return answers.jiraAuthType === 'oauth' && !defaults.oauth && !accessToken;
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
                type: 'rawlist',
                name: 'workitemType',
                message: 'What is the type of TFS workitems to be created using TestFairy Connect?',
                choices: ['Bug', 'Task', 'User Story'],
                default: defaults.workitemType || 'Bug',
                when: function (answers) {
                    return answers.type === 'tfs';
                }
            },
            {
                type: 'rawlist',
                name: 'action',
                message: 'Please review your choices. What would you like to do?',
                default: 'save',
                choices: [
                    {
                        key: 's',
                        name: 'Save',
                        value: 'save'
                    },
                    {
                        key: 'r',
                        name: 'Restart',
                        value: 'restart'
                    },
                    new inquirer.Separator(),
                    {
                        key: 'd',
                        name: 'Discard',
                        value: 'discard'
                    }
                ]
            }
        ];
        inquirer.prompt(questions).then(function (answers) {
            switch (answers.action) {
            case 'discard':
                console.info('Config not saved. Exiting.');
                process.exit(0);
                break;
            case 'save':
                save(answers, defaults);
                break;
            case 'restart':
                answers.oauth = (keypair ? false : defaults.oauth); //pass on old oauth configuration unless we have a new key
                restart(answers);
                break;
            }
        }).catch(function (e) {
            console.error(e.message);
        });
    }
    launch(defaults);

}());
