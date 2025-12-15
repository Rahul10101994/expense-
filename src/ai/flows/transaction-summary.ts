'use server';
/**
 * @fileOverview Summarizes transactions within categories and identifies unusual or unexpected transactions.
 *
 * - summarizeTransactions - A function that summarizes transactions.
 * - TransactionSummaryInput - The input type for the summarizeTransactions function.
 * - TransactionSummaryOutput - The return type for the summarizeTransactions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionSchema = z.object({
  date: z.string().describe('The date of the transaction.'),
  description: z.string().describe('A description of the transaction.'),
  amount: z.number().describe('The amount of the transaction.'),
  category: z.string().describe('The category of the transaction (e.g., Food, Shopping, Income, Investment).'),
});

const TransactionSummaryInputSchema = z.object({
  transactions: z.array(TransactionSchema).describe('An array of transactions to summarize.'),
  budgetGoals: z.record(z.string(), z.number()).describe('A map of category to monthly budget goal.'),
});
export type TransactionSummaryInput = z.infer<typeof TransactionSummaryInputSchema>;

const TransactionSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the transactions, including total income, expenses, and investments.'),
  unusualTransactions: z.array(TransactionSchema).describe('An array of potentially unusual or unexpected transactions.'),
  spendingByCategory: z.record(z.string(), z.number()).describe('Spending by category.'),
  recommendations: z.array(z.string()).describe('Recommendations for improving financial health'),
});
export type TransactionSummaryOutput = z.infer<typeof TransactionSummaryOutputSchema>;

export async function summarizeTransactions(input: TransactionSummaryInput): Promise<TransactionSummaryOutput> {
  return transactionSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'transactionSummaryPrompt',
  input: {schema: TransactionSummaryInputSchema},
  output: {schema: TransactionSummaryOutputSchema},
  prompt: `You are a personal finance expert. Analyze the following transactions and provide a summary, identify unusual transactions, and provide personalized recommendations.

Transactions:
{{#each transactions}}
- Date: {{date}}, Description: {{description}}, Amount: {{amount}}, Category: {{category}}
{{/each}}

Budget Goals:
{{#each budgetGoals}}
- Category: {{@key}}, Goal: {{this}}
{{/each}}

Based on this information, generate:
1.  A concise summary of the financial activity, including total income, expenses, and investments.
2.  A list of any potentially unusual or unexpected transactions that might warrant further investigation. Unusual is defined as significantly outside the norm for a category.
3.  A summary of spending by category.
4.  Personalized recommendations for improving financial health based on the spending patterns and budget goals.
`,
});

const transactionSummaryFlow = ai.defineFlow(
  {
    name: 'transactionSummaryFlow',
    inputSchema: TransactionSummaryInputSchema,
    outputSchema: TransactionSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
