import { Inngest} from "inngest";

export const inngest = new Inngest({
    id: 'STOXLY',
    ai: { gemini: { apiKey: process.env.GEMINI_API_KEY! }}
})