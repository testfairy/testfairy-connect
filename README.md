# TestFairy Connect 

## How does it work?

TestFairy Connect is designed to help developers integrate their bug tracking systems running behind firewall with their 
TestFairy account.

The key part of TestFairy Connect is the agent service (TFC Agent) that runs on a system also behind firewall, connecting to both 
TestFairy's web app and bug tracking system.


## Agent

### Installation Requirements

* Nodejs (verified with 4.2)
* npm (verified with 2.14)
* git (verified with 1.7 and 2.5)
* For TFS integration, please see [additional requirements](####Additionalrequirements) too

### Installation
    npm install https://github.com/testfairy/testfairy-connect
    
    
### Configuration

Configuration file `config.json` is located in `.testfairyconnect` under running user's home directory. Usually:

In linux

    /home/testfairyconnectuser/.testfairyconnect/config.json
    
In Windows

    C:\Users\testfairyconnectuser\.testfairyconnect\config.json


You'll need the following data:

* TestFairy Connect url (typically at [https://app.testfairy.com/connect/](https://app.testfairy.com/connect/). 
Might contain your organization subdomain instead of 'app'.
* TestFairy API key (found at [https://app.testfairy.com/settings/](https://www.testfairy.com/settings/))
* Url to you bug system.
* Valid credentials for a bug system user.
* List of projects to expose via TFC Agent.
 
## Supported issue trackers specific stuff

### JIRA

### Team Foundation Server (TFS)
#### Additional requirements

* The machine running TFC Agent must have [Microsoft Visual Studio Team Foundation Server 2015 Power Tools](https://visualstudiogallery.msdn.microsoft.com/898a828a-af00-42c6-bbb2-530dc7b8f2e1)
installed.

* In order to successfully integrate with TFS, user running TFC Agent must have write access to TFS project collection.
It might be a good idea to create a windows user called e.g. testfairyconnect, 
with permissions to both run the agent and create issues in TFS.

Example config.json can be found [here](config/tfs-example.config.json). Please note that `issueTracker.URL` setting
  should link to team project collection.

