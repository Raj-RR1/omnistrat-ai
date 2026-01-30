import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const google = createGoogleGenerativeAI();
const openai = createOpenAI();

const provider = process.env.MODEL_PROVIDER || 'openai';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModel(): any {
  if (provider === 'gemini') {
    return google('gemini-2.0-flash');
  }
  return openai('gpt-4o');
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: getModel(),
    messages,
  });

  return result.toDataStreamResponse();
}
