import { GoogleGenAI } from "@google/genai";

console.log("GEMINI KEY LOADED:", !!process.env.GEMINI_API_KEY);

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY as string,
});

/**
 * Generate AI insight for space partner based on feedback & NPS
 */
export const generateAiInsight = async (input: {
    averageRating: number;
    npsScore: number;
    promoters: number;
    passives: number;
    detractors: number;
    totalResponses: number;
    recentReviews: string[];
}) => {
    const prompt = `
You are a business growth advisor for coworking and virtual office spaces.

Customer feedback summary:
- Average Rating: ${input.averageRating}/5
- NPS Score: ${input.npsScore}
- Total Responses: ${input.totalResponses}
- Promoters: ${input.promoters}
- Passives: ${input.passives}
- Detractors: ${input.detractors}

Recent client reviews:
${input.recentReviews.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Give 3–4 actionable suggestions to improve bookings and revenue.
Respond in one short professional paragraph.
`;

    const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
    });

    return result.text;
};
