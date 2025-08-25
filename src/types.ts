import type { Context } from 'hono'

export type DefinedContext = Context<{ Bindings: ENV }>

export type ENV = {
    KV: KVNamespace;
    APP_ID?: string;
    PRIVATE_KEY?: string;
}

export type ConfigFile = {
    app_id: number,
    private_key: string,
    allowed_repos: Record<string, string[]>
}

export type Check = {
    source: string,
    targetRepo: string,
    targetWorkflow: string
    ref?: string,
}

export type WorkflowRequestBody = {
    targetRepo: string,
    targetWorkflow: string,
    ref?: string,
    extra?: Map<string, string>
}
