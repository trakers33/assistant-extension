import { optionsStorage } from '@extension/storage/lib/impl/optionsStorage';

export interface ChatCompletionParams {
    apiKey: string;
    messages: Array<{ role: string; content: string }>;
    model?: string;
    temperature?: number;
    responseFormat?: any;
}

export interface ChatCompletionResult {
    summary: string;
    actionItems: Array<{ title: string; description: string; probability: number }>;
    error?: string;
}

/**
 * Generic: Call the OpenAI Chat Completion API
 */
export async function callChatCompletion({
    apiKey,
    messages,
    model = 'o4-mini',
    temperature = 1,
    responseFormat,
}: ChatCompletionParams) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            ...(responseFormat ? { response_format: responseFormat } : {}),
        }),
    });
    return response.json();
}

/**
 * Specific: Generate a meeting summary and action items using OpenAI
 * Accepts all relevant meeting data and builds prompts internally.
 */
export interface GenerateSummaryParams {
    captions: string;
    instruction?: string;
    profile: {
        userName: string;
        objective: string;
        structure: string;
        tone?: string;
        language?: string;
        audience?: string;
    };
    model?: string;
    temperature?: number;
}

export async function generateSummary({
    captions,
    instruction,
    profile,
    model = 'o4-mini',
    temperature = 1,
}: GenerateSummaryParams): Promise<ChatCompletionResult> {
    const options = await optionsStorage.get();
    const apiKey = options.openAIApiKey;
    if (!apiKey || typeof apiKey !== 'string') {
        return { summary: '', actionItems: [], error: 'No OpenAI API key set.' };
    }
    // Build the system prompt
    const systemPrompt =
        `Current user is "${profile.userName}". Your objective is: ${profile.objective}\n` +
        `Please use the following structure: ${profile.structure}\n` +
        (profile.tone ? `Tone: ${profile.tone}\n` : '') +
        (profile.language ? `Language: ${profile.language}\n` : '') +
        (profile.audience ? `Audience: ${profile.audience}\n` : '') +
        (instruction ? `Additional instructions: ${instruction}\n` : '') +
        `\nFor each action item, estimate a probability (between 0 and 1) that this action item is truly required, based on the transcript.\nInclude a 'probability' field for each action item.`;
    // Build the user prompt
    const userPrompt = `Here is the transcript of the meeting:\n${captions}`;
    const responseFormat = {
        type: 'json_schema',
        json_schema: {
            name: 'output_schema',
            schema: {
                type: 'object',
                properties: {
                    summary: {
                        type: 'string',
                        description: 'A markdown summary of the meeting (without action items)',
                    },
                    actionItems: {
                        type: 'array',
                        description: 'A list of action items that were defined in the meeting.',
                        items: {
                            type: 'object',
                            properties: {
                                title: { type: 'string', description: 'Action item title' },
                                description: { type: 'string', description: 'Action item description' },
                                probability: {
                                    type: 'number',
                                    description: 'Probability (0-1) that this action item is truly required',
                                },
                            },
                            required: ['title', 'description', 'probability'],
                            additionalProperties: false,
                        },
                    },
                },
                required: ['summary', 'actionItems'],
                additionalProperties: false,
            },
            strict: true,
        },
    };
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];
    const data = await callChatCompletion({
        apiKey,
        messages,
        model,
        temperature,
        responseFormat,
    });
    return processSummaryResponse(data);
}

/**
 * Specific: Process the OpenAI response for meeting summary/action items
 */
function processSummaryResponse(data: any): ChatCompletionResult {
    if (data.error) {
        return { summary: '', actionItems: [], error: data.error };
    }
    let summary = '';
    let actionItems: Array<{ title: string; description: string; probability: number }> = [];
    const content = data.choices?.[0]?.message?.content;
    if (content) {
        try {
            const parsed = JSON.parse(content);
            summary = parsed.summary || '';
            actionItems = parsed.actionItems || [];
            // Sort action items by probability descending
            actionItems = actionItems.sort(
                (a: { probability: number }, b: { probability: number }) => (b.probability || 0) - (a.probability || 0),
            );
        } catch (e) {
            return { summary: '', actionItems: [], error: 'Failed to parse OpenAI response.' };
        }
    }
    return { summary, actionItems };
}

// Only expose the specific generateSummary for use in the background job
export const openai = {
    generateSummary,
};

// Future: Add more OpenAI API methods here (e.g., embeddings, moderation, etc.)
