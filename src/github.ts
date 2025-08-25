
import { WorkflowRequestBody } from './types';

async function GitHubResponseLogs(resp: Response) {
    console.log("Github response:")
    console.log(resp.status)
    console.log(resp.statusText)
    console.log(await resp.text())
}

export async function TriggerRepositoryDispatch(token: string, body: WorkflowRequestBody): Promise<boolean> {
    console.log("Triggering workflow")
    console.log(body)
    const getInstallAPPIDResponse = await fetch(`https://api.github.com/repos/${body.targetRepo}/installation`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Cyb3rJak3 OIDC Dispatcher'
        }
    })
    if (getInstallAPPIDResponse.status != 200) {
        console.error("Failed to get installation ID")
        await GitHubResponseLogs(getInstallAPPIDResponse)
        return false
    }
    const installAppURL = await getInstallAPPIDResponse.json<{access_tokens_url: string}>()
    if (!installAppURL.access_tokens_url) {
        console.error("Failed to get access token URL")
        return false
    }
    const repoAPIResponse = await fetch(installAppURL.access_tokens_url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Cyb3rJak3 OIDC Dispatcher'
        },
        body: JSON.stringify({
            repositories: [body.targetRepo.split('/')[1]]
        })
    })
    if (repoAPIResponse.status != 201) {
        console.error("Failed to get access token")
        await GitHubResponseLogs(repoAPIResponse)
        return false
    }
    const repoAPIURL = await repoAPIResponse.json<{token: string, expires_at: string}>()
    if (!repoAPIURL.token) {
        console.error("Failed to get access token")
        return false
    }
    const repoToken = repoAPIURL.token
    const expires_atDate = new Date(repoAPIURL.expires_at)
    if (expires_atDate < new Date()) {
        console.error("Token expired")
        return false
    }
    const response = await fetch(`https://api.github.com/repos/${body.targetRepo}/actions/workflows/${body.targetWorkflow}/dispatches`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${repoToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Cyb3rJak3 OIDC Dispatcher'
        },
        body: JSON.stringify({
            ref: body.ref || 'main',
            inputs: body.extra
        })
    })
    if (response.status != 204) {
        console.error("Failed to trigger workflow")
        await GitHubResponseLogs(response)
        return false
    }
    return true
}