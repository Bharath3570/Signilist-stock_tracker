import {inngest} from "@/lib/inngest/client";
import {NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT} from "@/lib/inngest/prompts";
import {sendNewsSummaryEmail, sendWelcomeEmail} from "@/lib/nodemailer";
import { sendStockPriceAlertEmail } from "@/lib/nodemailer";
import {getAllUsersForNewsEmail} from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews, getStockDetails } from "@/lib/actions/finnhub.actions";
import { getFormattedTodayDate } from "@/lib/utils";
import { connectToDatabase } from "@/database/mongoose";
import { Alert } from "@/database/models/alert.model";
import { AlertHistory } from "@/database/models/alert-history.model";
import { Notification } from "@/database/models/notification.model";

export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email' },
    { event: 'app/user.created' },
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        const introText = await step.run('generate-welcome-intro', async () => {
            const fallback =
                'Thanks for joining Stoxly. You now have the tools to track markets and make smarter moves.';

            // If AI isn't configured, don't block welcome email.
            if (!process.env.GEMINI_API_KEY) return fallback;

            try {
                const response = await Promise.race([
                    step.ai.infer('generate-welcome-intro-ai', {
                        model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
                        body: {
                            contents: [
                                {
                                    role: 'user',
                                    parts: [{ text: prompt }],
                                },
                            ],
                        },
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('AI intro timed out')), 8000)
                    ),
                ]);

                const part = response.candidates?.[0]?.content?.parts?.[0];
                const text = part && 'text' in part ? part.text : null;
                return text || fallback;
            } catch (error) {
                // If AI fails (quota/network/key), still send a welcome email.
                console.error('welcome-email: AI intro generation failed', error);
                return fallback;
            }
        });

        await step.run('send-welcome-email', async () => {
            const { data: { email, name } } = event;
            return await sendWelcomeEmail({ email, name, intro: introText });
        });

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    // Inngest cron is UTC. 09:30 IST = 04:00 UTC.
    { id: 'daily-news-summary' },
    [{ event: 'app/send.daily.news' }, { cron: '0 4 * * *' }],
    async ({ step }) => {
        // Step #1: Get all users for news delivery
        const users = await step.run('get-all-users', getAllUsersForNewsEmail)

        if(!users || users.length === 0) return { success: false, message: 'No users found for news email' };

        // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
        const results = await step.run('fetch-user-news', async () => {
            const perUser: Array<{
                user: UserForNewsEmail;
                symbols: string[];
                articles: MarketNewsArticle[];
            }> = [];
            for (const user of users as UserForNewsEmail[]) {
                try {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    let articles = await getNews(symbols);
                    // Enforce max 6 articles per user
                    articles = (articles || []).slice(0, 6);
                    // If still empty, fallback to general
                    if (!articles || articles.length === 0) {
                        articles = await getNews();
                        articles = (articles || []).slice(0, 6);
                    }
                    perUser.push({ user, symbols, articles });
                } catch (error) {
                    console.error('daily-news: error preparing user news', user.email, error);
                    perUser.push({ user, symbols: [], articles: [] });
                }
            }
            return perUser;
        });

        // Step #3: (placeholder) Summarize news via AI
        const userNewsSummaries: { user: UserForNewsEmail; newsContent: string | null }[] = [];

        for (const { user, symbols, articles } of results) {
            try {
                const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
                    '{{newsData}}',
                    JSON.stringify({ watchedSymbols: symbols, articles }, null, 2)
                );

                const response = await step.ai.infer(`summarize-news-${user.email}`, {
                    model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
                    body: {
                        contents: [{ role: 'user', parts: [{ text:prompt }]}]
                    }
                });

                const part = response.candidates?.[0]?.content?.parts?.[0];
                const newsContent = (part && 'text' in part ? part.text : null) || 'No market news.'

                userNewsSummaries.push({ user, newsContent });
            } catch {
                console.error('Failed to summarize news for : ', user.email);
                userNewsSummaries.push({ user, newsContent: null });
            }
        }

        // Step #4: (placeholder) Send the emails
        await step.run('send-news-emails', async () => {
            await Promise.all(
                userNewsSummaries.map(async ({ user, newsContent}) => {
                    if(!newsContent) return false;

                    return await sendNewsSummaryEmail({ email: user.email, date: getFormattedTodayDate(), newsContent })
                })
            )
        })

        return { success: true, message: 'Daily news summary emails sent successfully' }
    }
)

export const checkPriceAlerts = inngest.createFunction(
    { id: 'check-price-alerts' },
    [{ event: 'app/alerts.check' }, { cron: '*/5 * * * *' }],
    async ({ step }) => {
        await step.run('connect-db', connectToDatabase);

        const alerts = await step.run('load-alerts', async () => {
            const list = await Alert.find({ isActive: true }).lean();
            return list;
        });

        if (!alerts || alerts.length === 0) {
            return { success: true, checked: 0, triggered: 0 };
        }

        let triggered = 0;

        for (const alert of alerts as Array<Record<string, unknown>>) {
            try {
                const symbol = String(alert.symbol || '').toUpperCase();
                const condition: '>' | '<' = alert.condition === '>' ? '>' : '<';
                const target = Number(alert.targetPrice);
                const userEmail = String(alert.userEmail || '').toLowerCase();
                const alertId = String(alert._id);

                if (!symbol || !userEmail || !Number.isFinite(target)) continue;

                const stock = await getStockDetails(symbol);
                const current = stock?.price ?? 0;

                if (!Number.isFinite(current) || current <= 0) continue;

                const isMet = condition === '>' ? current > target : current < target;
                if (!isMet) continue;

                triggered += 1;

                await step.run(`send-alert-${alertId}`, async () => {
                    await sendStockPriceAlertEmail({
                        email: userEmail,
                        symbol,
                        company: String(alert.company || stock?.company || symbol),
                        currentPrice: stock?.priceFormatted || `$${current.toFixed(2)}`,
                        targetPrice: `$${target.toFixed(2)}`,
                        condition,
                        timestamp: new Date().toLocaleString('en-US', { timeZone: 'UTC' }),
                    });
                });

                await step.run(`record-alert-history-${alertId}`, async () => {
                    await AlertHistory.create({
                        userEmail,
                        alertId,
                        alertName: String(alert.alertName || `${symbol} Alert`),
                        symbol,
                        company: String(alert.company || stock?.company || symbol),
                        condition,
                        targetPrice: target,
                        triggerPrice: current,
                        triggeredAt: new Date(),
                    });

                    await Notification.create({
                        userEmail,
                        title: 'Alert triggered',
                        message: `${symbol} hit your alert condition at $${current.toFixed(2)}.`,
                        category: 'alert',
                        href: '/alerts',
                        isRead: false,
                        createdAt: new Date(),
                    });
                });

                // Avoid spamming: disable after first trigger (can be changed later to "once per day").
                await step.run(`deactivate-alert-${alertId}`, async () => {
                    await Alert.findByIdAndUpdate(alertId, {
                        $set: { isActive: false, lastTriggeredAt: new Date() },
                    });
                });
            } catch (error) {
                console.error('checkPriceAlerts error for alert', alert?._id, error);
            }
        }

        return { success: true, checked: alerts.length, triggered };
    }
);
