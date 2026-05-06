import nodemailer from 'nodemailer';
import {
    NEWS_SUMMARY_EMAIL_TEMPLATE,
    STOCK_ALERT_LOWER_EMAIL_TEMPLATE,
    STOCK_ALERT_UPPER_EMAIL_TEMPLATE,
    WELCOME_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    }
})

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE
        .replace('{{name}}', name)
        .replace('{{intro}}', intro);

    const mailOptions = {
        from: `"Stoxly" <Stoxly@pro>`,
        to: email,
        subject: `Welcome to Stoxly - your stock market toolkit is ready!`,
        text: 'Thanks for joining Stoxly',
        html: htmlTemplate,
    }

    await transporter.sendMail(mailOptions);
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
): Promise<void> => {
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace('{{date}}', date)
        .replace('{{newsContent}}', newsContent);

    const mailOptions = {
        from: `"Stoxly News" <stoxly@jsmastery.pro>`,
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: `Today's market news summary from Stoxly`,
        html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
};

export const sendStockPriceAlertEmail = async (params: {
    email: string;
    symbol: string;
    company: string;
    currentPrice: string;
    targetPrice: string;
    condition: '>' | '<';
    timestamp: string;
}) => {
    const template =
        params.condition === '>' ? STOCK_ALERT_UPPER_EMAIL_TEMPLATE : STOCK_ALERT_LOWER_EMAIL_TEMPLATE;

    const htmlTemplate = template
        .replaceAll('{{symbol}}', params.symbol)
        .replaceAll('{{company}}', params.company)
        .replaceAll('{{currentPrice}}', params.currentPrice)
        .replaceAll('{{targetPrice}}', params.targetPrice)
        .replaceAll('{{timestamp}}', params.timestamp);

    const subject =
        params.condition === '>'
            ? `Price Alert: ${params.symbol} crossed above ${params.targetPrice}`
            : `Price Alert: ${params.symbol} dropped below ${params.targetPrice}`;

    await transporter.sendMail({
        from: `"Stoxly Alerts" <stoxly-alerts@jsmastery.pro>`,
        to: params.email,
        subject,
        text: `${params.symbol} price alert triggered (${params.condition} ${params.targetPrice}). Current: ${params.currentPrice}`,
        html: htmlTemplate,
    });
};
