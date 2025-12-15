'use server';

/**
 * @fileOverview AI-powered budget goal suggestion flow.
 *
 * This file defines a Genkit flow that suggests personalized budget goals based on user's financial data.
 *   - `suggestBudgetGoals` -  The function that orchestrates the budget goal suggestion process.
 *   - `BudgetGoalSuggestionsInput` -  The input type for the `suggestBudgetGoals` function.
 *   - `BudgetGoalSuggestionsOutput` - The output type for the `suggestBudgetGoals` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BudgetGoalSuggestionsInputSchema = z.object({
  income: z.number().describe('Monthly income of the user.'),
  spendingByCategory: z.record(z.string(), z.number()).describe('Record of user spending by category for the last month.'),
  financialGoals: z.array(z.string()).describe('User specified financial goals, such as saving for a down payment or paying off debt.'),
  riskTolerance: z
    .enum(['low', 'medium', 'high'])
    .describe('The users willingness to take financial risk.'),
});
export type BudgetGoalSuggestionsInput = z.infer<typeof BudgetGoalSuggestionsInputSchema>;

const BudgetGoalSuggestionsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      goal: z.string().describe('A specific budget goal.'),
      amount: z.number().describe('The suggested amount for the goal.'),
      rationale: z.string().describe('The rationale behind the suggestion.'),
    })
  ).describe('An array of budget goal suggestions.'),
});
export type BudgetGoalSuggestionsOutput = z.infer<typeof BudgetGoalSuggestionsOutputSchema>;

export async function suggestBudgetGoals(input: BudgetGoalSuggestionsInput): Promise<BudgetGoalSuggestionsOutput> {
  return suggestBudgetGoalsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'budgetGoalSuggestionsPrompt',
  input: {schema: BudgetGoalSuggestionsInputSchema},
  output: {schema: BudgetGoalSuggestionsOutputSchema},
  prompt: `You are a financial advisor providing personalized budget goal suggestions.

  Based on the user's income, spending habits, financial goals, and risk tolerance, suggest realistic and achievable budget goals.

  Income: {{{income}}}
  Spending by Category: {{{spendingByCategory}}}
  Financial Goals: {{{financialGoals}}}
  Risk Tolerance: {{{riskTolerance}}}

  Provide specific, actionable goals with suggested amounts and a brief rationale for each suggestion.

  Format your response as a JSON object conforming to the following schema:
  ${BudgetGoalSuggestionsOutputSchema.description} 
  ${JSON.stringify(BudgetGoalSuggestionsOutputSchema.shape, null, 2)}`,
});

const suggestBudgetGoalsFlow = ai.defineFlow(
  {
    name: 'suggestBudgetGoalsFlow',
    inputSchema: BudgetGoalSuggestionsInputSchema,
    outputSchema: BudgetGoalSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
