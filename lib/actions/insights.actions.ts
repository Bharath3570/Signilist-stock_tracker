'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { Insight } from '@/database/models/insight.model';
import { getNews } from '@/lib/actions/finnhub.actions';
import { getWatchlistWithData } from '@/lib/actions/watchlist.actions';

export type InsightPayload = {
    dateKey: string;
    title: string;
    subheading: string;
    overallTrend: 'bullish' | 'bearish' | 'mixed';
    watchlistSnapshot: {
        count: number;
        avgChangePercent: number | null;
    };
    topGainer: {
        symbol: string;
        company: string;
        changeFormatted: string;
        priceFormatted: string;
        reason: string;
    } | null;
    topLoser: {
        symbol: string;
        company: string;
        changeFormatted: string;
        priceFormatted: string;
        reason: string;
    } | null;
    keyTakeaways: string[];
    newsHighlights: Array<{
        headline: string;
        source: string;
        symbol?: string;
        takeaway: string;
        url?: string;
    }>;
    disclaimer: string;
};

export type InsightResult =
    | { ok: true; payload: InsightPayload; used: 'gemini' | 'heuristic'; cached: boolean }
    | { ok: false; error: string };

const requireSessionUser = async () => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.email) redirect('/sign-in');
    return session.user;
};

const getDateKey = () => new Date().toISOString().slice(0, 10);

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function safeJsonParse<T>(value: string): T | null {
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

function extractJsonObject(text: string) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
}

function clampNumber(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function buildHeuristicPayload(input: {
    dateKey: string;
    watchlist: StockWithData[];
    news: MarketNewsArticle[];
}): InsightPayload {
    const changeValues = input.watchlist
        .map((item) => (typeof item.changePercent === 'number' ? item.changePercent : null))
        .filter((v): v is number => v !== null);
    const avgChange = changeValues.length
        ? changeValues.reduce((sum, v) => sum + v, 0) / changeValues.length
        : null;
    const overallTrend: InsightPayload['overallTrend'] =
        avgChange === null ? 'mixed' : avgChange > 0.4 ? 'bullish' : avgChange < -0.4 ? 'bearish' : 'mixed';

    const sorted = input.watchlist
        .filter((item) => typeof item.changePercent === 'number')
        .slice()
        .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));

    const topGainer = sorted[0] ?? null;
    const topLoser = sorted.length ? sorted[sorted.length - 1] : null;

    const highlights = (input.news || []).slice(0, 3).map((article) => ({
        headline: article.headline,
        source: article.source,
        symbol: article.related || undefined,
        takeaway: article.summary ? article.summary.slice(0, 140).trim() : 'News may be influencing today’s move.',
        url: article.url,
    }));

    return {
        dateKey: input.dateKey,
        title: "Today's Watchlist Brief",
        subheading: 'A quick snapshot of what’s moving in your watchlist right now.',
        overallTrend,
        watchlistSnapshot: {
            count: input.watchlist.length,
            avgChangePercent: avgChange === null ? null : Number(avgChange.toFixed(2)),
        },
        topGainer: topGainer
            ? {
                  symbol: topGainer.symbol,
                  company: topGainer.company,
                  changeFormatted: topGainer.changeFormatted || 'N/A',
                  priceFormatted: topGainer.priceFormatted || 'N/A',
                  reason: 'Leading today based on price change within your watchlist.',
              }
            : null,
        topLoser: topLoser
            ? {
                  symbol: topLoser.symbol,
                  company: topLoser.company,
                  changeFormatted: topLoser.changeFormatted || 'N/A',
                  priceFormatted: topLoser.priceFormatted || 'N/A',
                  reason: 'Lagging today based on price change within your watchlist.',
              }
            : null,
        keyTakeaways: [
            `Overall watchlist tone looks ${overallTrend}.`,
            'Use alerts + news context to validate today’s move (this brief is metric-driven).',
            'If a stock has N/A change data, it may be an API limitation or a non-supported exchange endpoint.',
        ],
        newsHighlights: highlights,
        disclaimer: 'Educational only. Not financial advice.',
    };
}

async function callGemini(payload: {
    dateKey: string;
    watchlist: StockWithData[];
    news: MarketNewsArticle[];
}): Promise<InsightPayload | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const model = process.env.GEMINI_INSIGHTS_MODEL || 'gemini-2.5-pro';

    const compactWatchlist = payload.watchlist.slice(0, 12).map((item) => ({
        symbol: item.symbol,
        company: item.company,
        priceFormatted: item.priceFormatted,
        changeFormatted: item.changeFormatted,
        changePercent: item.changePercent ?? null,
        marketCap: item.marketCap,
        peRatio: item.peRatio,
    }));

    const compactNews = (payload.news || []).slice(0, 6).map((article) => ({
        headline: article.headline,
        summary: article.summary,
        source: article.source,
        url: article.url,
        related: article.related,
        datetime: article.datetime,
    }));

    const schemaExample = {
        dateKey: 'YYYY-MM-DD',
        title: 'string',
        subheading: 'string',
        overallTrend: '"bullish" | "bearish" | "mixed"',
        watchlistSnapshot: { count: 0, avgChangePercent: 0 },
        topGainer: {
            symbol: 'string',
            company: 'string',
            changeFormatted: 'string',
            priceFormatted: 'string',
            reason: 'string',
        },
        topLoser: {
            symbol: 'string',
            company: 'string',
            changeFormatted: 'string',
            priceFormatted: 'string',
            reason: 'string',
        },
        keyTakeaways: ['string'],
        newsHighlights: [
            { headline: 'string', source: 'string', symbol: 'string?', takeaway: 'string', url: 'string?' },
        ],
        disclaimer: 'string',
    };

    const prompt = `You are an elite financial product copywriter + analyst. Generate a premium "AI Insights" daily brief for the user’s watchlist.

RULES:
- Use ONLY the provided watchlist metrics + news summaries.
- Keep it crisp, confident, and presentation-ready for a final-year project demo.
- No buy/sell instructions. No hype. No guarantees.
- Return ONLY valid JSON (no markdown, no backticks).
- keyTakeaways must be 3-6 bullets.
- newsHighlights must be 2-4 items with short, strong takeaways.

JSON SHAPE EXAMPLE:
${JSON.stringify(schemaExample, null, 2)}

DATE:
${payload.dateKey}

WATCHLIST DATA:
${JSON.stringify(compactWatchlist, null, 2)}

NEWS DATA:
${JSON.stringify(compactNews, null, 2)}
`;

    const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 900,
            },
        }),
    });

    if (!res.ok) return null;

    type GeminiPart = { text?: string };
    type GeminiCandidate = { content?: { parts?: GeminiPart[] } };
    type GeminiGenerateContentResponse = { candidates?: GeminiCandidate[] };

    const data = (await res.json()) as GeminiGenerateContentResponse;
    const raw = data.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === 'string')?.text;
    if (typeof raw !== 'string') return null;

    const jsonText = extractJsonObject(raw.trim()) ?? raw.trim();
    const parsed = safeJsonParse<InsightPayload>(jsonText);
    if (!parsed?.dateKey) return null;

    // Basic guardrails for UI.
    parsed.watchlistSnapshot = {
        count: Math.max(0, Number(parsed.watchlistSnapshot?.count ?? 0)),
        avgChangePercent:
            typeof parsed.watchlistSnapshot?.avgChangePercent === 'number'
                ? clampNumber(parsed.watchlistSnapshot.avgChangePercent, -99, 99)
                : null,
    };

    return parsed;
}

export async function getDailyInsights(options?: { force?: boolean }): Promise<InsightResult> {
    const user = await requireSessionUser();
    const userEmail = user.email.toLowerCase();
    const dateKey = getDateKey();

    await connectToDatabase();

    if (!options?.force) {
        const existing = await Insight.findOne({ userEmail, dateKey }).lean();
        if (existing?.payload) {
            return { ok: true, payload: existing.payload as InsightPayload, used: 'gemini', cached: true };
        }
    }

    const watchlist = await getWatchlistWithData();
    if (!watchlist || watchlist.length === 0) {
        return { ok: false, error: 'Your watchlist is empty. Add a few stocks first to generate insights.' };
    }

    const symbols = watchlist.map((item) => item.symbol).slice(0, 10);
    const news = await getNews(symbols);

    const payloadInput = { dateKey, watchlist, news };

    const geminiPayload = await callGemini(payloadInput);
    const finalPayload = geminiPayload ?? buildHeuristicPayload(payloadInput);
    const used: 'gemini' | 'heuristic' = geminiPayload ? 'gemini' : 'heuristic';

    await Insight.findOneAndUpdate(
        { userEmail, dateKey },
        {
            $set: {
                symbols,
                payload: finalPayload,
                updatedAt: new Date(),
            },
            $setOnInsert: {
                userEmail,
                dateKey,
                createdAt: new Date(),
            },
        },
        { upsert: true, returnDocument: 'after' }
    );

    return { ok: true, payload: finalPayload, used, cached: false };
}

export async function regenerateDailyInsights() {
    return getDailyInsights({ force: true });
}
