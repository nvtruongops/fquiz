
export type PromptDefinition<TParams, TSchema> = {
  name: string
  version: string
  schema: TSchema
  buildPrompt: (params: TParams) => string
}

export type PromptMap = Record<string, PromptDefinition<unknown, unknown>>


