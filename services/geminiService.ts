
import { GoogleGenAI, Type } from "@google/genai";
import { Account } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async categorizeTransaction(description: string, amount: number, accounts: Account[]): Promise<{ category: string; isContractor: boolean; confidence: number; suggestedAccountId?: string }> {
    try {
      // DYNAMICALLY fetch the latest accounts list from the PASSED argument
      const activeAccounts = accounts.filter(a => a.status !== 'archived');
      
      // Create a simplified list of leaf-node accounts for the AI to choose from
      const accountMap = activeAccounts
        .filter(a => a.parentId) // Only child accounts
        .map(a => a.name)
        .join(', ');

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this bank transaction description: "${description}" with amount $${amount}. 
        
        Task:
        1. Select the BEST MATCH from this Chart of Accounts list: [${accountMap}].
        For example:
        - "American Airlines" -> "Flights"
        - "Adobe" -> "Adobe CC"
        - "Shell" -> "Fuel" or "Gas (Job Specific)"
        - "Hampton Inn" -> "Hotels"
        
        2. Identify if the vendor is likely an independent contractor requiring 1099 tracking.
        
        Return JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedAccountName: {
                type: Type.STRING,
                description: "The exact name of the account from the provided list."
              },
              isContractor: {
                type: Type.BOOLEAN,
                description: "True if the vendor appears to be an independent contractor."
              },
              confidence: {
                type: Type.NUMBER,
                description: "Confidence score between 0 and 1"
              }
            },
            required: ['suggestedAccountName', 'isContractor', 'confidence']
          }
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      
      // Find the ID based on the name (using the fresh list)
      const matchedAccount = activeAccounts.find(a => a.name === result.suggestedAccountName);

      return {
        category: result.suggestedAccountName || 'Uncategorized',
        suggestedAccountId: matchedAccount?.id,
        isContractor: result.isContractor || false,
        confidence: result.confidence || 0
      };

    } catch (error) {
      console.error("Gemini API Error:", error);
      return { category: 'Uncategorized', isContractor: false, confidence: 0 };
    }
  }
}

export const geminiService = new GeminiService();
