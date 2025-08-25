import config from './../config.json'
import { Check } from './types'

export async function CheckRepoAccess(check: Check): Promise<boolean> {
    // console.log(check)
    if (!check.source || !check.targetRepo || !check.targetWorkflow) {
        return false
    }
    const allowedRepos = config.allowed_repos
    if (!allowedRepos) {
        console.error("No allowed repos in config")
        return false
    }

    if (!allowedRepos[check.targetRepo]) {
        console.error(`Could not find repo for ${check.targetRepo}`)
        return false
    }
    const repoInfo = allowedRepos[check.targetRepo]
    // console.log(`Repo info: ${repoInfo}`)
    if (!repoInfo.source.includes(check.source) && !repoInfo.source.includes('*')) {
        console.error(`Source ${check.source} not allowed for ${check.targetRepo}`)
        return false
    }
    if (!repoInfo.workflows.includes(check.targetWorkflow) && !repoInfo.workflows.includes('*')) {
        console.error(`Workflow ${check.targetWorkflow} not allowed for ${check.targetRepo}`)
        return false
    }

    return true
}
