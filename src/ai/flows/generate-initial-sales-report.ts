'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating an initial sales report.
 *
 * The flow takes a sales script as input and returns feedback on how to improve it.
 * It exports the `generateInitialSalesReport` function, the `GenerateInitialSalesReportInput` type, and the `GenerateInitialSalesReportOutput` type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInitialSalesReportInputSchema = z.object({
  salesScript: z
    .string()
    .describe('The sales script to be reviewed.'),
});
export type GenerateInitialSalesReportInput = z.infer<typeof GenerateInitialSalesReportInputSchema>;

const GenerateInitialSalesReportOutputSchema = z.object({
  feedback: z.string().describe('Feedback on how to improve the sales script.'),
});
export type GenerateInitialSalesReportOutput = z.infer<typeof GenerateInitialSalesReportOutputSchema>;

export async function generateInitialSalesReport(input: GenerateInitialSalesReportInput): Promise<GenerateInitialSalesReportOutput> {
  return generateInitialSalesReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInitialSalesReportPrompt',
  input: {schema: GenerateInitialSalesReportInputSchema},
  output: {schema: GenerateInitialSalesReportOutputSchema},
  prompt: `You are a sales expert providing feedback on a sales script.

  Provide actionable feedback on how to improve the following sales script:
  \n
  {{{salesScript}}}
  `,
});

const generateInitialSalesReportFlow = ai.defineFlow(
  {
    name: 'generateInitialSalesReportFlow',
    inputSchema: GenerateInitialSalesReportInputSchema,
    outputSchema: GenerateInitialSalesReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
