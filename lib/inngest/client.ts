import { Inngest} from "inngest";

export const inngest = new Inngest({
    id: 'signalist',
    // Allow builds/deploys without Gemini configured; functions handle missing keys.
    ai: { gemini: { apiKey: process.env.GEMINI_API_KEY } }
})
