'use server';

/**
 * @fileOverview Generates personalized financial insights and recommendations based on user's financial data.
 *
 * - getPersonalizedInsights - A function that generates personalized financial insights.
 * - PersonalizedInsightsInput - The input type for the getPersonalizedInsights function.
 * - PersonalizedInsightsOutput - The return type for the getPersonalizedInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedInsightsInputSchema = z.object({
  spendingPatterns: z
    .string()
    .describe('Description of spending patterns of the user.'),
  income: z.number().describe('The income of the user.'),
  financialGoals: z.string().describe('The financial goals of the user.'),
});
export type PersonalizedInsightsInput = z.infer<typeof PersonalizedInsightsInputSchema>;

const PersonalizedInsightsOutputSchema = z.object({
  insights: z.string().describe('Personalized financial insights and recommendations.'),
});
export type PersonalizedInsightsOutput = z.infer<typeof PersonalizedInsightsOutputSchema>;

export async function getPersonalizedInsights(
  input: PersonalizedInsightsInput
): Promise<PersonalizedInsightsOutput> {
  return personalizedInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedInsightsPrompt',
  input: {schema: PersonalizedInsightsInputSchema},
  output: {schema: PersonalizedInsightsOutputSchema},
  prompt: `You are a financial advisor providing personalized insights and recommendations.

  Based on the user's spending patterns, income, and financial goals, provide actionable advice to improve their financial well-being.

  Spending Patterns: {{{spendingPatterns}}}
  Income: {{{income}}}
  Financial Goals: {{{financialGoals}}}

  Provide clear, concise, and easy-to-understand recommendations.
  Speak directly to the user and keep it conversational.
  Do not include any calculations, just the final recommendation.
  End the response with a call to action.
  `,
});

const personalizedInsightsFlow = ai.defineFlow(
  {
    name: 'personalizedInsightsFlow',
    inputSchema: PersonalizedInsightsInputSchema,
    outputSchema: PersonalizedInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
