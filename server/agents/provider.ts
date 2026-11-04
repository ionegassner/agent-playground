export interface BrowserAction {
  action: 'click' | 'select' | 'scroll' | 'finish';
  target: number;
  value: string;
  summary: string;
}
export const browserTool = {
  type: 'function',
  name: 'browser_action',
  description:
    'Take one browser action using a control index from the latest observation. Provide a short decision summary, not private chain of thought.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['click', 'select', 'scroll', 'finish'] },
      target: { type: 'integer' },
      value: { type: 'string' },
      summary: { type: 'string' },
    },
    required: ['action', 'target', 'value', 'summary'],
    additionalProperties: false,
  },
};
export interface ModelReply {
  action: BrowserAction;
  output: unknown[];
  callId: string;
  inputTokens: number;
  outputTokens: number;
}
export type ModelCall = (
  model: string,
  instructions: string,
  input: unknown[],
  maxOutput: number,
  signal: AbortSignal,
  options?: { reasoningEffort?: 'low' | 'medium' | 'high'; memorySteps?: number },
) => Promise<ModelReply>;
export const openaiCall: ModelCall = async (
  model,
  instructions,
  input,
  maxOutput,
  signal,
  options,
) => {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      model,
      ...(options?.reasoningEffort ? { reasoning: { effort: options.reasoningEffort } } : {}),
      instructions,
      input,
      tools: [browserTool],
      tool_choice: { type: 'function', name: 'browser_action' },
      parallel_tool_calls: false,
      max_output_tokens: maxOutput,
      store: false,
      include: ['reasoning.encrypted_content'],
    }),
  });
  if (!response.ok)
    throw new Error(
      `Model request failed (HTTP ${response.status}). Check model access, API configuration, or quota.`,
    );
  const data = (await response.json()) as {
    output: { type: string; name?: string; call_id?: string; arguments?: string }[];
    usage?: { input_tokens: number; output_tokens: number };
  };
  const call = data.output.find(
    (item) => item.type === 'function_call' && item.name === 'browser_action',
  );
  if (!call?.arguments || !call.call_id)
    throw new Error('The model did not return a browser action within the response limit.');
  const action = JSON.parse(call.arguments) as BrowserAction;
  if (
    !['click', 'select', 'scroll', 'finish'].includes(action.action) ||
    !Number.isInteger(action.target) ||
    typeof action.value !== 'string' ||
    typeof action.summary !== 'string'
  )
    throw new Error('The model returned an invalid browser action.');
  return {
    action,
    output: data.output,
    callId: call.call_id,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
};
