/**
 * Pizza delivery prompt example
 * run example by writing `node pizza.js` in your console
 */

'use strict';
var inquirer = require('inquirer');



function buildTestFairyConfig(answers) {
    return {
        "timeout": 1000,
        "apiKey": answers.testfairyApiKey,
        "URL": "https://app.testfairy.com/connect"
    };
}
function buildJiraConfig(answers) {
    var jiraConfig = {
        "type": "jira",
        "strictSSL": false
    };
    if (answers.jiraAuthType === 'basic') {
        jiraConfig.username = answers.username;
        jiraConfig.password = answers.password;
    } else {
        jiraConfig.oauth = {
            "consumer_key": "testfairy-connect",
            "private_key_path": answers.private_key_path,
            "token": answers.token,
            "token_secret": answers.token_secret
        };
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

var questions = [
    {
        type: 'input',
        name: 'testfairyApiKey',
        message: 'What is your TestFairy API Key?'
    },
    {
        type: 'list',
        name: 'type',
        message: 'What kind of issue tracking system will you use with TestFairy Connect?',
        choices: ['JIRA', 'TFS'],
        filter: function (val) {
            return val.toLowerCase();
        }
    },
    {
        type: 'list',
        name: 'jiraAuthType',
        message: 'How shall TestFairy Connect authenticate to JIRA?',
        choices: ['basic', 'oauth'],
        default: 'basic',
        when: function (answers) {
            return answers.type === 'jira';
        }
    },
    {
        type: 'input',
        name: 'URL',
        message: 'What\'s your JIRA URL (please avoid trailing slash, e.g. https://example.atlassian.net)?',
        when: function (answers) {
            return answers.type === 'jira';
        }
    },
    {
        type: 'input',
        name: 'issueType',
        message: 'What\'s type of JIRA issues to be created using TestFairy Connect?',
        default: 'Bug',
        when: function (answers) {
            return answers.type === 'jira';
        }
    },
    {
        type: 'input',
        name: 'username',
        message: 'JIRA username:',
        when: function (answers) {
            return answers.jiraAuthType === 'basic';
        }
    },
    {
        type: 'password',
        name: 'password',
        message: 'JIRA password:',
        when: function (answers) {
            return answers.jiraAuthType === 'basic';
        }
    },
    {
        type: 'input',
        name: 'private_key_path',
        message: 'Path to your private key file:',
        when: function (answers) {
            return answers.jiraAuthType === 'oauth';
        }
    },
    {
        type: 'input',
        name: 'token',
        message: 'Token:',
        when: function (answers) {
            return answers.jiraAuthType === 'oauth';
        }
    },
    {
        type: 'input',
        name: 'token_secret',
        message: 'Token Secret:',
        when: function (answers) {
            return answers.jiraAuthType === 'oauth';
        }
    },
    {
        type: 'input',
        name: 'URL',
        message: 'What\'s your TFS Collection URL (please avoid trailing slash, e.g. http://localhost:8080/tfs/DefaultCollection)?',
        when: function (answers) {
            return answers.type === 'tfs';
        }
    },
    {
        type: 'list',
        name: 'workitemType',
        message: 'What\'s type of TFS workitems to be created using TestFairy Connect?',
        choices: ['Bug', 'Task', 'User Story'],
        default: 'Bug',
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
    console.log('Configuration complete. Please do not forget to manually edit list of projects to be exposed to TestFairy.');
    console.log('For your convenience, we are providing 2 placeholder projects (["PROJECT1", "PROJECT2"]) to this configuration.');
    console.log('Please make sure that you edit this list to contain the projects that exist on your issue tracker.');
    config.issueTracker.projects = ["PROJECT1", "PROJECT2"];
    console.log(JSON.stringify(config, null, '\t'));
});
