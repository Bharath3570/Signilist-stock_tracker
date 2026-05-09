import {serve} from "inngest/next";
import {inngest} from "@/lib/inngest/client";
import {checkPriceAlerts, sendDailyNewsSummary, sendSignUpEmail} from "@/lib/inngest/functions";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [sendSignUpEmail, sendDailyNewsSummary, checkPriceAlerts],
})
