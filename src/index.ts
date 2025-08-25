import { Hono } from "hono";
import { Check, DefinedContext, ENV, WorkflowRequestBody} from "./types";
import { TriggerRepositoryDispatch } from "./github";
import { CheckRepoAccess } from "./config_checker";
import * as jose from 'jose'
import config from './../config.json'
import { importPrivateKey } from './github_utils';

async function GenerateGithubToken(c: DefinedContext): Promise<string> {
	const env = c.env
	let githubToken = await env.KV.get('githubToken', { type: 'text' })
	if (githubToken === null || githubToken === "") {
		if (!config.private_key) {
			console.error("No private key in config")
			return ""
		}
		let privateKeyString: string = config.private_key
		if (privateKeyString === "ENV:PRIVATE_KEY" && env.PRIVATE_KEY) {
			privateKeyString = env.PRIVATE_KEY
		}
		if (!privateKeyString) {
			console.error("No private key in config")
			return ""
		}
		if (!config.app_id) {
			console.error("No app ID in config")
			return ""
		}
		let appID: string = config.app_id
		if (config.app_id === "ENV:APP_ID" && env.APP_ID) {
			appID = env.APP_ID
		}
		const privateKey = await importPrivateKey(privateKeyString)
		githubToken = await new jose.SignJWT({
			iss: appID,
			iat: new Date().getTime() / 1000,
		}).setProtectedHeader({ alg: 'RS256' })
		.setExpirationTime('10m')
		.sign(privateKey)
		if (!githubToken || githubToken === "") {
			console.error("Failed to sign token")
			return ""
		}
		c.executionCtx.waitUntil(env.KV.put('githubToken', githubToken, { expirationTtl: 60 * 9 }))
	}
	return githubToken
}

const app = new Hono<{ Bindings: ENV }>()


app.all('/', async (c: DefinedContext) => {
	return c.notFound()
})

app.post('/api/v1/workflow', async (c: DefinedContext) => {
	const jwtToken = c.req.header('Authorization')
	if (!jwtToken) {
		return new Response('No token provided', { status: 401 })
	}
	const JWKS = jose.createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'))
	const { payload } = await jose.jwtVerify(jwtToken, JWKS, {
		issuer: 'https://token.actions.githubusercontent.com',
		algorithms: ['RS256']
	})
	if (!payload.sub) {
		console.log("No sub in token")
		return c.text("No sub in token", { status: 400 })
	}
	const requestBody = await c.req.json<WorkflowRequestBody>()
	if (!requestBody.targetRepo) {
		console.log("No target provided")
		return c.text("No target provided", { status: 400 })
	}
	if (!payload.repository || typeof payload.repository !== 'string') {
		console.log("Missing repository in claim")
		return c.text("Missing repository in claim", { status: 400 })
	}
	const checkConfig: Check = {
		source: payload.repository,
		targetRepo: requestBody.targetRepo,
		targetWorkflow: requestBody.targetWorkflow,
		ref: requestBody.ref || 'main'
	}
	const checkResult = await CheckRepoAccess(checkConfig)
	if (!checkResult) {
		console.log("Config check failed")
		return c.text("Config check failed", { status: 403 })
	}
	const githubToken = await GenerateGithubToken(c)
	if (!githubToken) {
		console.error("Failed to get token")
		return c.text("Failed to get token", { status: 500 })
	}
	const status = await TriggerRepositoryDispatch(githubToken, checkConfig)
	if (!status) {
		console.error("Failed to trigger dispatch")
		return c.text("Failed to trigger dispatch", { status: 500 })
	}
	return c.text("Dispatch triggered", { status: 200 })
})

export default app
