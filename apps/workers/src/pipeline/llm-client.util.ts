import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type LlmProvider = 'openai' | 'deepseek';

export type LlmClientConfig = {
  client: OpenAI | null;
  model: string;
  provider: LlmProvider;
  label: string;
};

/** Chat LLM for hook analysis — OpenAI or DeepSeek (OpenAI-compatible API). */
export function createHookAnalysisLlmClient(config: ConfigService): LlmClientConfig {
  const raw = (config.get<string>('llmProvider') ?? 'openai').toLowerCase();
  const provider: LlmProvider = raw === 'deepseek' ? 'deepseek' : 'openai';

  if (provider === 'deepseek') {
    const apiKey = config.get<string>('deepseekApiKey');
    const model = config.get<string>('deepseekModel') ?? 'deepseek-v4-flash';
    const baseURL = config.get<string>('deepseekBaseUrl') ?? 'https://api.deepseek.com';

    return {
      provider: 'deepseek',
      model,
      label: `DeepSeek (${model})`,
      client: apiKey
        ? new OpenAI({
            apiKey,
            baseURL,
            maxRetries: 2,
            timeout: 120_000,
          })
        : null,
    };
  }

  const apiKey = config.get<string>('openaiApiKey');
  const model = config.get<string>('openaiModel') ?? 'gpt-4o';

  return {
    provider: 'openai',
    model,
    label: `OpenAI (${model})`,
    client: apiKey
      ? new OpenAI({
          apiKey,
          maxRetries: 2,
          timeout: 120_000,
        })
      : null,
  };
}
