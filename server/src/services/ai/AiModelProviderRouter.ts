import OpenAI from 'openai';

export type AiModelWorkflow = 'assistant' | 'agent' | 'meeting';
export type AiModelProviderKind = 'openai' | 'local-llm';

export interface AiModelResponseCall {
  workflow: AiModelWorkflow;
  model: string;
  payload: Record<string, unknown>;
  forceProvider?: AiModelProviderKind;
}

export interface AiModelResponseResult {
  provider: AiModelProviderKind;
  model: string;
  response: any;
  fallbackReason?: string | null;
}

export interface AiProviderStatus {
  openai: {
    enabled: boolean;
    assistantModel: string;
    agentModel: string;
    meetingModel: string;
  };
  local: {
    enabled: boolean;
    baseUrl: string;
    assistantModel: string;
    agentModel: string;
    meetingModel: string;
    timeoutMs: number;
    fallbackToOpenAI: boolean;
    workflows: Record<AiModelWorkflow, boolean>;
    probe?: {
      ok: boolean;
      status?: number;
      error?: string;
      models?: string[];
    };
  };
}

const DEFAULT_LOCAL_BASE_URL = 'http://127.0.0.1:1234/v1';
const DEFAULT_LOCAL_API_KEY = 'lm-studio';
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_PROBE_TIMEOUT_MS = 2_500;

function cleanEnv(value: string | undefined) {
  return value?.trim() || '';
}

function envFlag(name: string, defaultValue = false) {
  const value = cleanEnv(process.env[name]).toLowerCase();
  if (!value) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value);
}

function envNumber(name: string, defaultValue: number) {
  const value = Number(cleanEnv(process.env[name]));
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

function workflowSuffix(workflow: AiModelWorkflow) {
  switch (workflow) {
    case 'agent':
      return 'AGENT';
    case 'meeting':
      return 'MEETING';
    case 'assistant':
    default:
      return 'ASSISTANT';
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Unknown AI provider error');
}

export class AiModelProviderRouter {
  hasConfiguredTextModel(workflow: AiModelWorkflow) {
    return this.isLocalWorkflowEnabled(workflow) || Boolean(cleanEnv(process.env.OPENAI_API_KEY));
  }

  canFallbackToOpenAI() {
    return this.shouldFallbackToOpenAI() && Boolean(cleanEnv(process.env.OPENAI_API_KEY));
  }

  resolveOpenAIModel(workflow: AiModelWorkflow) {
    if (workflow === 'agent') {
      return cleanEnv(process.env.OPENAI_AGENT_MODEL)
        || cleanEnv(process.env.OPENAI_ASSISTANT_MODEL)
        || cleanEnv(process.env.OPENAI_MEETING_MODEL)
        || 'gpt-4o-mini';
    }

    if (workflow === 'meeting') {
      return cleanEnv(process.env.OPENAI_MEETING_MODEL) || 'gpt-4o-mini';
    }

    return cleanEnv(process.env.OPENAI_ASSISTANT_MODEL)
      || cleanEnv(process.env.OPENAI_MEETING_MODEL)
      || 'gpt-4o-mini';
  }

  resolveLocalModel(workflow: AiModelWorkflow, fallbackModel: string) {
    const suffix = workflowSuffix(workflow);
    return cleanEnv(process.env[`LOCAL_LLM_${suffix}_MODEL`])
      || cleanEnv(process.env.LOCAL_LLM_MODEL)
      || fallbackModel;
  }

  async createResponse(call: AiModelResponseCall): Promise<AiModelResponseResult> {
    const localAllowed = !call.forceProvider || call.forceProvider === 'local-llm';
    let localError: unknown = null;

    if (localAllowed && this.isLocalWorkflowEnabled(call.workflow)) {
      try {
        const model = this.resolveLocalModel(call.workflow, call.model);
        const response = await this.createLocalResponse(call, model);
        return { provider: 'local-llm', model, response };
      } catch (error) {
        localError = error;
        const shouldThrow = call.forceProvider === 'local-llm'
          || !this.shouldFallbackToOpenAI()
          || !cleanEnv(process.env.OPENAI_API_KEY);

        if (shouldThrow) {
          throw error;
        }
      }
    }

    if (call.forceProvider === 'local-llm') {
      throw localError || new Error('Local LLM provider is not enabled for this workflow.');
    }

    const apiKey = cleanEnv(process.env.OPENAI_API_KEY);
    if (apiKey) {
      const response = await this.createOpenAIResponse(call, call.model, apiKey);
      return {
        provider: 'openai',
        model: call.model,
        response,
        fallbackReason: localError ? `Local LLM failed: ${errorMessage(localError)}` : null,
      };
    }

    if (localError) {
      throw localError;
    }

    throw new Error('No AI text provider is configured.');
  }

  async getStatus(options: { probeLocal?: boolean } = {}): Promise<AiProviderStatus> {
    const status: AiProviderStatus = {
      openai: {
        enabled: Boolean(cleanEnv(process.env.OPENAI_API_KEY)),
        assistantModel: this.resolveOpenAIModel('assistant'),
        agentModel: this.resolveOpenAIModel('agent'),
        meetingModel: this.resolveOpenAIModel('meeting'),
      },
      local: {
        enabled: this.isLocalEnabled(),
        baseUrl: this.localBaseUrl(),
        assistantModel: this.resolveLocalModel('assistant', this.resolveOpenAIModel('assistant')),
        agentModel: this.resolveLocalModel('agent', this.resolveOpenAIModel('agent')),
        meetingModel: this.resolveLocalModel('meeting', this.resolveOpenAIModel('meeting')),
        timeoutMs: this.localTimeoutMs(),
        fallbackToOpenAI: this.shouldFallbackToOpenAI(),
        workflows: {
          assistant: this.isLocalWorkflowEnabled('assistant'),
          agent: this.isLocalWorkflowEnabled('agent'),
          meeting: this.isLocalWorkflowEnabled('meeting'),
        },
      },
    };

    if (options.probeLocal && status.local.enabled) {
      status.local.probe = await this.probeLocal();
    }

    return status;
  }

  private isLocalEnabled() {
    if (cleanEnv(process.env.LOCAL_LLM_ENABLED)) {
      return envFlag('LOCAL_LLM_ENABLED');
    }

    return Boolean(cleanEnv(process.env.LOCAL_LLM_BASE_URL));
  }

  private isLocalWorkflowEnabled(workflow: AiModelWorkflow) {
    if (!this.isLocalEnabled()) return false;
    const suffix = workflowSuffix(workflow);
    return envFlag(`LOCAL_LLM_USE_FOR_${suffix}`, true);
  }

  private shouldFallbackToOpenAI() {
    return envFlag('LOCAL_LLM_FALLBACK_TO_OPENAI', true);
  }

  private localBaseUrl() {
    return trimTrailingSlash(cleanEnv(process.env.LOCAL_LLM_BASE_URL) || DEFAULT_LOCAL_BASE_URL);
  }

  private localTimeoutMs() {
    return envNumber('LOCAL_LLM_TIMEOUT_MS', DEFAULT_TIMEOUT_MS);
  }

  private openAiTimeoutMs() {
    return envNumber('OPENAI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS);
  }

  private localApiKey() {
    return cleanEnv(process.env.LOCAL_LLM_API_KEY) || DEFAULT_LOCAL_API_KEY;
  }

  private localPayload(call: AiModelResponseCall, model: string) {
    const payload: Record<string, unknown> = { ...call.payload, model };
    delete payload.prompt_cache_key;
    delete payload.prompt_cache_retention;

    const reasoningEffort = cleanEnv(process.env.LOCAL_LLM_REASONING_EFFORT || 'none');
    if (reasoningEffort && !payload.reasoning) {
      payload.reasoning = { effort: reasoningEffort };
    }

    if (!payload.max_output_tokens) {
      payload.max_output_tokens = envNumber('LOCAL_LLM_MAX_OUTPUT_TOKENS', 1800);
    }

    return payload;
  }

  private async createLocalResponse(call: AiModelResponseCall, model: string) {
    const client = new OpenAI({
      apiKey: this.localApiKey(),
      baseURL: this.localBaseUrl(),
      timeout: this.localTimeoutMs(),
    });

    return client.responses.create(this.localPayload(call, model) as any);
  }

  private async createOpenAIResponse(call: AiModelResponseCall, model: string, apiKey: string) {
    const client = new OpenAI({
      apiKey,
      timeout: this.openAiTimeoutMs(),
    });

    return client.responses.create({ ...call.payload, model } as any);
  }

  private async probeLocal() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), envNumber('LOCAL_LLM_PROBE_TIMEOUT_MS', DEFAULT_PROBE_TIMEOUT_MS));

    try {
      const response = await fetch(`${this.localBaseUrl()}/models`, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.localApiKey()}`,
        },
      });
      const body = await response.json().catch(() => null) as { data?: Array<{ id?: string }> } | null;
      return {
        ok: response.ok,
        status: response.status,
        models: Array.isArray(body?.data)
          ? body.data.map((model) => String(model.id || '')).filter(Boolean).slice(0, 20)
          : [],
      };
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
