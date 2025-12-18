import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    'Please set the GEMINI_API_KEY environment variable in your .env.local file'
  );
}

export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY})],
  model: 'googleai/gemini-2.5-flash',
});
