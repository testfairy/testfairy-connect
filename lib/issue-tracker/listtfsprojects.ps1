Add-Type -AssemblyName "Microsoft.TeamFoundation.Client, Version=12.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a"
Add-Type -Path "C:\Program Files (x86)\Microsoft Visual Studio 14.0\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Microsoft.TeamFoundation.Client.dll"



$tfsConfigurationServer = [Microsoft.TeamFoundation.Client.TfsConfigurationServerFactory]::GetConfigurationServer($uri)
$tpcService = $tfsConfigurationServer.GetService("Microsoft.TeamFoundation.Framework.Client.ITeamProjectCollectionService")
$collectionUri = "http://localhost:8080/tfs/DefaultCollection"
$tfsTeamProject = [Microsoft.TeamFoundation.Client.TfsTeamProjectCollectionFactory]::GetTeamProjectCollection($collectionUri)
$cssService = $tfsTeamProject.GetService("Microsoft.TeamFoundation.Server.ICommonStructureService3")
$sortedProjects = $cssService.ListProjects() | Sort-Object -Property Name

foreach($project in $sortedProjects)
{
	Write-Host (" - " + $project.Name)
}
