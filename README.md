# TestFairy Connect 

## How does it work?

TestFairy Connect is designed to help developers integrate their bug tracking systems running behind firewall with their 
TestFairy account.

The key part of TestFairy Connect is the agent service (TFC Agent) that runs on a system also behind firewall, connecting both 
TestFairy's web app and bug tracking system.


## Installation Requirements

* Nodejs 4.2+
* npm 2.14+
* git 1.7+ or 2.5+
* For TFS integration, please see [additional requirements](#additional-requirements) too

## Installation
    mkdir testfairyconnect
    cd testfairyconnect #this is the installation dir - where you run the TFC Agent from
    mkdir node_modules
    npm install https://github.com/testfairy/testfairy-connect
 
## Running TFC Agent
### Manually
From the installation dir run:

    node node_modules/testfairy-connect/service.js
    
### As a Windows Service
Upon installation, you'll find ```TestFairy Connect``` under Windows Services. Upon successful [configuration](#configuration),
you can try starting the service from the Services console.
    
## Configuration

Configuration file `config.json` is located in `.testfairyconnect` under running user's home directory. 

In linux

    ~/.testfairyconnect/config.json
    
In Windows

    C:\Users\MyUser\.testfairyconnect\config.json


You'll need the following data:

* TestFairy Connect url (typically at [https://app.testfairy.com/connect/](https://app.testfairy.com/connect/). 
Might contain your organization subdomain instead of 'app'.
* TestFairy API key (found at [https://app.testfairy.com/settings/](https://www.testfairy.com/settings/))
* Url to you bug system.
* Valid credentials for a bug system user.
* List of projects to expose via TFC Agent.

## Supported issue trackers specific stuff

### JIRA

Example ```config.json```:
   
    {
        "testfairy": {
            "timeout": 5000,
            "apiKey": "[as found under Upload API Key @ https://www.testfairy.com/settings]",
            "URL": "https://app.testfairy.com/connect"
        },
        "issueTracker": {
            "type": "jira",
            "issueType": "Bug",
            "URL": "http://localhost:2990/jira",
            "username": "admin",
            "password": "admin",
            "strictSSL": false,
            "oauth": false,
            "projects": ["PROJECT1", "PROJECT2"],
            "fieldMapping": {
                "status": "status",
                "summary": "summary",
                "description": "description"
            }
        }
    }


Please note that `issueTracker.URL` setting  should have proper schema (https or http), port (if not default), and path to JIRA application included.
   

### Team Foundation Server (TFS)

#### Additional Requirements
* The machine running TFC Agent must have [Microsoft Visual Studio Team Foundation Server 2015 Power Tools](https://visualstudiogallery.msdn.microsoft.com/898a828a-af00-42c6-bbb2-530dc7b8f2e1)
installed.

* In order to successfully integrate with TFS, user running TFC Agent must have write access to TFS project collection.
It might be a good idea to create a windows user called e.g. testfairyconnect, 
with permissions to both run the agent and create issues in TFS.

Example config.json:

    {
        "testfairy": {
            "timeout": 5000,
            "apiKey": "[as found under Upload API Key @ https://www.testfairy.com/settings]",
            "URL": "https://app.testfairy.com/connect"
        },
        "issueTracker": {
            "type": "tfs",
            "URL": "http://localhost:8080/tfs/DefaultCollection",
            "projects": ["Project1", "Project2"],
            "fieldMapping": {
                "status": "State",
                "summary": "Title",
                "description": "Repro Steps"
            }
        }
    }

Please note that `issueTracker.URL` setting should link to team project collection that the projects belong to.

