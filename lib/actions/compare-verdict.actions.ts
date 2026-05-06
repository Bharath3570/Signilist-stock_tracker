'use server';

import { getStockDetails } from '@/lib/actions/finnhub.actions';

type CompareVerdictStock = {
    symbol: string;
    company: string;
    price: number;
    priceFormatted: string;
    changeFormatted: string;
    changePercent: number | null;
    marketCap: number;
    marketCapFormatted: string;
    peRatio: string;
};

export type CompareVerdict = {
    title: string;
    summary: string;
    winnerSymbol: string | null;
    winnerReason: string;
    confidenceLabel: 'High confidence' | 'Medium confidence' | 'Low confidence';
    scorecard: Array<{
        symbol: string;
        momentum: number;
        valuation: number;
        stability: number;
        overall: number;
        bestFor: string;
        caution: string;
    }>;
    keyTakeaways: string[];
    perStock: Array<{
        symbol: string;
        pros: string[];
        cons: string[];
    }>;
    disclaimer: string;
};

type CompareVerdictResult =
    | { ok: true; verdict: CompareVerdict; used: 'gemini' | 'heuristic' }
    | { ok: false; error: string };

const GEMINI_API_BASE =
    'https://generativelanguage.googleapis.com/v1beta/models';

function normalizeSymbols(input: string[]): string[] {
    const clean = input
        .map((s) => (typeof s === 'string' ? s.trim().toUpperCase() : ''))
        .filter(Boolean);
    return Array.from(new Set(clean)).slice(0, 5);
}

function safeJsonParse<T>(value: string): T | null {
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

function clampScore(value: number) {
    return Math.max(50, Math.min(95, Math.round(value)));
}

function parsePeRatio(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function scoreStocks(stocks: CompareVerdictStock[]) {
    const marketCaps = stocks.map((stock) => stock.marketCap).filter((value) => value > 0);
    const maxMarketCap = marketCaps.length ? Math.max(...marketCaps) : 0;

    return stocks.map((stock) => {
        const momentum = clampScore(70 + (stock.changePercent ?? 0) * 5);
        const pe = parsePeRatio(stock.peRatio);
        const valuationBase = pe === null ? 68 : pe < 18 ? 88 : pe < 28 ? 78 : pe < 40 ? 68 : 58;
        const stabilityBase =
            maxMarketCap > 0 && stock.marketCap > 0 ? 60 + (stock.marketCap / maxMarketCap) * 30 : 65;
        const valuation = clampScore(valuationBase);
        const stability = clampScore(stabilityBase);
        const overall = clampScore(momentum * 0.45 + valuation * 0.25 + stability * 0.3);

        return {
            symbol: stock.symbol,
            momentum,
            valuation,
            stability,
            overall,
        };
    });
}

function buildHeuristicVerdict(stocks: CompareVerdictStock[]): CompareVerdict {
    const scorecard = scoreStocks(stocks);
    const movers = stocks
        .filter((s) => typeof s.changePercent === 'number')
        .slice()
        .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));

    const winner = movers[0] ?? null;
    const loser = movers.length > 0 ? movers[movers.length - 1] : null;
    const winnerScore = winner
        ? scorecard.find((entry) => entry.symbol === winner.symbol)
        : scorecard.slice().sort((left, right) => right.overall - left.overall)[0];

    const keyTakeaways: string[] = [];
    if (winner) keyTakeaways.push(`${winner.symbol} is leading on today's move (${winner.changeFormatted}).`);
    if (loser && loser.symbol !== winner?.symbol)
        keyTakeaways.push(`${loser.symbol} is lagging today (${loser.changeFormatted}).`);
    keyTakeaways.push('The score blends short-term momentum, valuation context, and company size for a cleaner comparison.');

    const enrichedScorecard = scorecard.map((entry) => ({
        ...entry,
        bestFor:
            entry.momentum >= 80
                ? 'Momentum-focused tracking'
                : entry.stability >= 80
                  ? 'Steadier large-cap exposure'
                  : 'Balanced watchlist coverage',
        caution:
            entry.valuation <= 62
                ? 'Valuation looks stretched versus peers.'
                : entry.momentum <= 62
                  ? 'Recent momentum is softer than peers.'
                  : 'Needs news context before drawing a stronger conclusion.',
    }));

    return {
        title: winnerScore ? `${winnerScore.symbol} stands out in this comparison` : 'Comparison verdict',
        summary:
            'This verdict blends today’s move with valuation context and company size, so it feels closer to an analyst snapshot than a raw table readout.',
        winnerSymbol: winnerScore?.symbol ?? null,
        winnerReason: winnerScore
            ? `${winnerScore.symbol} edges ahead with the strongest overall mix of momentum, valuation context, and stability.`
            : 'No single stock has a strong edge from the currently available data.',
        confidenceLabel: stocks.length >= 4 ? 'High confidence' : stocks.length >= 3 ? 'Medium confidence' : 'Low confidence',
        scorecard: enrichedScorecard,
        keyTakeaways,
        perStock: stocks.map((s) => ({
            symbol: s.symbol,
            pros: [
                `Change today: ${s.changeFormatted}`,
                `Market cap: ${s.marketCapFormatted}`,
                `P/E ratio: ${s.peRatio}`,
            ],
            cons: ['Consider checking recent news or earnings because this verdict only uses the metrics on the page.'],
        })),
        disclaimer:
            'Educational only. Not financial advice. Verify with fundamentals, news, and your risk tolerance.',
    };
}

async function callGeminiForVerdict(stocks: CompareVerdictStock[]): Promise<CompareVerdict | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    // Default to a widely-available model; upgrade via GEMINI_COMPARE_MODEL for "wow" output.
    const model = process.env.GEMINI_COMPARE_MODEL || 'gemini-2.5-flash';

    const schema = {
        title: 'string',
        summary: 'string',
        winnerSymbol: 'string|null',
        winnerReason: 'string',
        confidenceLabel: '"High confidence" | "Medium confidence" | "Low confidence"',
        scorecard: [
            {
                symbol: 'string',
                momentum: 'number',
                valuation: 'number',
                stability: 'number',
                overall: 'number',
                bestFor: 'string',
                caution: 'string',
            },
        ],
        keyTakeaways: 'string[]',
        perStock: [
            {
                symbol: 'string',
                pros: 'string[]',
                cons: 'string[]',
            },
        ],
        disclaimer: 'string',
    };

    const prompt = `You are a helpful stock market analyst. Create a short "AI Verdict" for a side-by-side comparison.

RULES:
- Do NOT give explicit buy/sell instructions.
- Focus only on the provided metrics.
- Keep it punchy and premium, like a productized analyst verdict.
- Return ONLY valid JSON (no markdown, no extra text).
- Scores must be integers between 50 and 95.
- winnerReason should be one short polished sentence.
- bestFor and caution should each be one short sentence.

JSON SHAPE (example types):
${JSON.stringify(schema, null, 2)}

STOCK METRICS:
${JSON.stringify(stocks, null, 2)}
`;

    const url = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 700,
            },
        }),
    });

    if (!res.ok) return null;

    type GeminiPart = { text?: string };
    type GeminiCandidate = { content?: { parts?: GeminiPart[] } };
    type GeminiGenerateContentResponse = { candidates?: GeminiCandidate[] };

    const data = (await res.json()) as GeminiGenerateContentResponse;
    const rawText = data.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === 'string')?.text;
    if (typeof rawText !== 'string') return null;

    const parsed = safeJsonParse<CompareVerdict>(rawText.trim());
    return parsed;
}

export async function generateCompareVerdict(symbols: string[]): Promise<CompareVerdictResult> {
    const normalized = normalizeSymbols(symbols);

    if (normalized.length < 2) {
        return { ok: false, error: 'Pick at least 2 symbols to generate a verdict.' };
    }

    const details = await Promise.all(normalized.map((s) => getStockDetails(s)));
    const stocks: CompareVerdictStock[] = details
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((d) => ({
            symbol: d.symbol,
            company: d.company,
            price: d.price,
            priceFormatted: d.priceFormatted,
            changeFormatted: d.changeFormatted,
            changePercent: typeof d.changePercent === 'number' ? d.changePercent : null,
            marketCap: d.marketCap,
            marketCapFormatted: d.marketCapFormatted,
            peRatio: d.peRatio,
        }));

    if (stocks.length < 2) {
        return { ok: false, error: 'Not enough stock data available to generate a verdict right now.' };
    }

    const geminiVerdict = await callGeminiForVerdict(stocks);
    if (geminiVerdict) {
        return { ok: true, verdict: geminiVerdict, used: 'gemini' };
    }

    return { ok: true, verdict: buildHeuristicVerdict(stocks), used: 'heuristic' };
}
