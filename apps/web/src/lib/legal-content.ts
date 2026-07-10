import { SITE_NAME, SITE_URL } from "./seo";

export const CONTACT_EMAIL = "hello@autoclipr.com";
export const LEGAL_LAST_UPDATED = "June 10, 2026";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  list?: string[];
};

export type LegalDocumentContent = {
  title: string;
  intro: string[];
  sections: LegalSection[];
};

export const PRIVACY_POLICY: LegalDocumentContent = {
  title: "Privacy Policy",
  intro: [
    `${SITE_NAME} ("we", "us", or "our") operates ${SITE_URL} and related services that help creators turn long-form videos into short clips using AI.`,
    "This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using AutoClipr, you agree to the practices described here.",
  ],
  sections: [
    {
      id: "information-we-collect",
      title: "1. Information we collect",
      paragraphs: ["We collect information in the following ways:"],
      list: [
        "Account information: name, email address, phone number (if provided), profile photo, and authentication data when you register or sign in via email, Google, or phone OTP through Supabase Auth.",
        "Profile and billing data: display name, subscription tier, credit balance, and account preferences stored in our database.",
        "Content you provide: videos you upload, URLs you submit for import, generated clips, captions, thumbnails, export files, and metadata associated with your projects.",
        "Connected platform data: when you link YouTube or other publishing accounts, we store OAuth tokens, account identifiers, and posting status needed to publish clips on your behalf.",
        "Usage and analytics: pages visited, feature usage, device/browser type, and approximate location derived from IP address. We use Vercel Analytics for aggregated website analytics.",
        "Feedback and support: messages you send through our feedback form, including name, email, category, and message content.",
        "Communications: records of support requests and emails you send to us.",
      ],
    },
    {
      id: "how-we-use",
      title: "2. How we use your information",
      list: [
        "Provide, operate, and maintain the AutoClipr service.",
        "Process videos with AI (transcription, clip detection, captions, scoring, and export).",
        "Manage your account, credits, subscriptions, and connected platforms.",
        "Publish clips to platforms you authorize (e.g., YouTube Shorts).",
        "Improve product performance, reliability, and user experience.",
        "Respond to feedback, support requests, and security incidents.",
        "Send service-related notices (e.g., account verification, billing, or important policy updates).",
        "Detect, prevent, and address fraud, abuse, or violations of our Terms.",
        "Comply with legal obligations.",
      ],
    },
    {
      id: "ai-processing",
      title: "3. AI and automated processing",
      paragraphs: [
        "AutoClipr uses automated systems and third-party AI providers to analyze audio/video, generate transcripts, identify clip candidates, create captions, and score content. By uploading content or submitting a URL, you instruct us to process that material for these purposes.",
        "We do not use your private video content to train public foundation models unless we explicitly tell you otherwise and obtain your consent.",
      ],
    },
    {
      id: "sharing",
      title: "4. How we share information",
      paragraphs: [
        "We do not sell your personal information. We share data only as described below:",
      ],
      list: [
        "Service providers: Supabase (database, auth, storage), cloud hosting (Vercel, Railway), Redis queue providers, AI/transcription providers, and analytics tools that help us run the service.",
        "Platforms you connect: when you publish a clip, necessary data is sent to the relevant platform (e.g., YouTube) according to your instructions.",
        "Legal and safety: when required by law, court order, or to protect rights, safety, and integrity of AutoClipr and our users.",
        "Business transfers: in connection with a merger, acquisition, or sale of assets, subject to continued protection of your data.",
      ],
    },
    {
      id: "retention",
      title: "5. Data retention",
      paragraphs: [
        "We retain your account information and content for as long as your account is active or as needed to provide the service. You may delete your account from Settings, which removes your profile and associated data subject to reasonable backup and legal retention periods.",
        "We may retain limited logs and anonymized analytics after deletion where required for security, fraud prevention, or legal compliance.",
      ],
    },
    {
      id: "security",
      title: "6. Security",
      paragraphs: [
        "We use industry-standard measures including encrypted connections (HTTPS), authenticated API access, row-level database protections, and access controls for infrastructure credentials. No method of transmission or storage is 100% secure; please use a strong password and keep your login credentials confidential.",
      ],
    },
    {
      id: "your-rights",
      title: "7. Your choices and rights",
      list: [
        "Access and update profile information in your account Settings.",
        "Delete your account and associated data from Settings.",
        "Disconnect third-party platforms at any time from platform setup pages.",
        "Opt out of non-essential marketing emails using unsubscribe links where provided.",
        "Depending on your location, you may have additional rights to access, correct, delete, or port your data, or to object to certain processing. Contact us to exercise these rights.",
      ],
    },
    {
      id: "cookies",
      title: "8. Cookies and similar technologies",
      paragraphs: [
        "We use essential cookies and local storage to keep you signed in and remember preferences (such as onboarding status). Analytics cookies may be used to understand how visitors use our website. You can control cookies through your browser settings, though some features may not work correctly if cookies are disabled.",
      ],
    },
    {
      id: "children",
      title: "9. Children's privacy",
      paragraphs: [
        "AutoClipr is not directed to children under 13 (or the minimum age required in your country). We do not knowingly collect personal information from children. If you believe a child has provided us data, contact us and we will delete it.",
      ],
    },
    {
      id: "international",
      title: "10. International transfers",
      paragraphs: [
        "Your information may be processed in countries other than where you live, including where our service providers operate. We take steps to ensure appropriate safeguards when data is transferred internationally.",
      ],
    },
    {
      id: "changes",
      title: "11. Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. We will post the revised version on this page and update the \"Last updated\" date. Material changes may be communicated by email or in-app notice where appropriate.",
      ],
    },
    {
      id: "google-api",
      title: "12. Google API & YouTube Data API disclosure",
      paragraphs: [
        "AutoClipr's use of information received from Google APIs (including the YouTube Data API v3) will adhere to the Google API Services User Data Policy, including the Limited Use requirements.",
      ],
      list: [
        "Scopes requested: AutoClipr requests access to your YouTube account solely to publish short clips on your behalf (scope: https://www.googleapis.com/auth/youtube.upload). We do not request access to read your private data, subscriptions, comments, or any content beyond what is needed to upload.",
        "What we access: only your YouTube channel identity (to confirm the correct channel) and the ability to upload videos you explicitly instruct us to publish.",
        "What we do NOT do: we do not read, store, or analyse your YouTube watch history, subscriptions, private playlists, comments, or any other YouTube data beyond channel identity and upload confirmation.",
        "How we store tokens: OAuth tokens are encrypted at rest in our database (Supabase, row-level security enabled) and transmitted only over HTTPS. Tokens are used exclusively to perform uploads you initiate.",
        "Token revocation: you can disconnect your YouTube account at any time from Settings → Platforms. When disconnected, we immediately delete the associated OAuth tokens from our system. You can also revoke access directly in your Google Account at https://myaccount.google.com/permissions.",
        "No token sharing: we never share, sell, or transfer your YouTube OAuth tokens or channel data to any third party except YouTube's own API endpoints during the upload operation.",
        "Data minimisation: we store only the minimum data required — channel ID, channel name, and the upload status of each clip. We do not build profiles of your YouTube audience or content.",
      ],
    },
    {
      id: "contact",
      title: "13. Contact us",
      paragraphs: [
        `For privacy questions or requests, email ${CONTACT_EMAIL} or use the feedback form at ${SITE_URL}/feedback.`,
      ],
    },
  ],
};

export const TERMS_AND_CONDITIONS: LegalDocumentContent = {
  title: "Terms & Conditions",
  intro: [
    `These Terms & Conditions ("Terms") govern your access to and use of ${SITE_NAME} at ${SITE_URL} and related applications, APIs, and services (collectively, the "Service").`,
    "By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use AutoClipr.",
  ],
  sections: [
    {
      id: "eligibility",
      title: "1. Eligibility",
      paragraphs: [
        "You must be at least 13 years old (or the age of digital consent in your jurisdiction) and able to form a binding contract. If you use the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.",
      ],
    },
    {
      id: "account",
      title: "2. Your account",
      list: [
        "You are responsible for maintaining the confidentiality of your login credentials.",
        "You must provide accurate account information and keep it up to date.",
        "You are responsible for all activity under your account.",
        "Notify us immediately if you suspect unauthorized access.",
        "We may suspend or terminate accounts that violate these Terms or pose security or legal risk.",
      ],
    },
    {
      id: "service",
      title: "3. The Service",
      paragraphs: [
        "AutoClipr provides AI-assisted tools to import or upload videos, generate short clips, add captions, export media, and optionally publish to connected social platforms. Features, credit costs, and availability may change over time.",
        "We strive for high availability but do not guarantee uninterrupted or error-free operation. Maintenance, third-party outages, or platform API changes may affect the Service.",
      ],
    },
    {
      id: "content",
      title: "4. Your content",
      paragraphs: [
        'You retain ownership of videos, clips, and other content you upload or create using AutoClipr ("User Content").',
        "You grant AutoClipr a limited, worldwide, non-exclusive license to host, process, transcode, analyze, store, display, and distribute User Content solely to provide and improve the Service, including AI processing and publishing to platforms you authorize.",
        "You represent that you have all rights necessary to upload, import, edit, and publish User Content and that your content does not infringe third-party rights or violate applicable laws or platform policies.",
      ],
    },
    {
      id: "acceptable-use",
      title: "5. Acceptable use",
      paragraphs: ["You agree not to:"],
      list: [
        "Upload or distribute unlawful, harmful, harassing, defamatory, obscene, or infringing content.",
        "Attempt to reverse engineer, scrape, overload, or disrupt the Service or its infrastructure.",
        "Circumvent credit limits, rate limits, authentication, or access controls.",
        "Use the Service to send spam or unauthorized advertising.",
        "Misrepresent your identity or impersonate others.",
        "Use the Service in violation of YouTube, TikTok, Instagram, or other third-party terms.",
      ],
    },
    {
      id: "third-party",
      title: "6. Third-party platforms and links",
      paragraphs: [
        "The Service integrates with third-party platforms (e.g., YouTube, Google OAuth). Your use of those platforms is governed by their own terms and policies. AutoClipr is not responsible for third-party services, API changes, takedowns, or account actions taken by those platforms.",
        "Importing content from URLs (such as YouTube) is subject to the source platform's rules and technical limitations. You are responsible for ensuring you have permission to use imported material.",
      ],
    },
    {
      id: "credits-billing",
      title: "7. Credits, subscriptions, and billing",
      list: [
        "Certain features consume credits or require a paid subscription as shown on our Pricing page.",
        "Credits and plan limits are described at purchase and may change with notice for future billing periods.",
        "Fees are generally non-refundable except where required by law or explicitly stated in a promotion.",
        "Failed processing jobs may consume credits depending on the stage of processing; we aim to charge fairly and may adjust credits for clear system errors at our discretion.",
        "You are responsible for applicable taxes unless we state otherwise.",
      ],
    },
    {
      id: "ai-disclaimer",
      title: "8. AI-generated output",
      paragraphs: [
        "Clips, captions, scores, and suggestions are generated automatically and may be inaccurate, incomplete, or unsuitable for your audience. You are solely responsible for reviewing, editing, and approving content before publishing.",
        "AutoClipr does not guarantee viral performance, views, monetization, or platform approval of generated content.",
      ],
    },
    {
      id: "ip",
      title: "9. AutoClipr intellectual property",
      paragraphs: [
        "The Service, including software, branding, design, and documentation (excluding User Content), is owned by AutoClipr and protected by intellectual property laws. You may not copy, modify, or create derivative works of the Service except as permitted by these Terms.",
      ],
    },
    {
      id: "termination",
      title: "10. Suspension and termination",
      paragraphs: [
        "You may stop using the Service and delete your account at any time from Settings. We may suspend or terminate access if you breach these Terms, if required by law, or to protect the Service and other users. Upon termination, your right to use the Service ends, but sections that by nature should survive (such as disclaimers and limitations of liability) will remain in effect.",
      ],
    },
    {
      id: "disclaimers",
      title: "11. Disclaimers",
      paragraphs: [
        'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      ],
    },
    {
      id: "liability",
      title: "12. Limitation of liability",
      paragraphs: [
        "To the maximum extent permitted by law, AutoClipr and its operators will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, goodwill, or business opportunities arising from your use of the Service.",
        "Our total liability for any claim relating to the Service will not exceed the greater of (a) the amount you paid us in the twelve (12) months before the claim or (b) one hundred U.S. dollars (USD $100), except where liability cannot be limited by law.",
      ],
    },
    {
      id: "indemnity",
      title: "13. Indemnification",
      paragraphs: [
        "You agree to indemnify and hold harmless AutoClipr from claims, damages, and expenses (including reasonable legal fees) arising from your User Content, your use of the Service, or your violation of these Terms or third-party rights.",
      ],
    },
    {
      id: "changes",
      title: "14. Changes to these Terms",
      paragraphs: [
        "We may modify these Terms from time to time. Updated Terms will be posted on this page with a revised date. Continued use after changes become effective constitutes acceptance. If you do not agree to updated Terms, you must stop using the Service.",
      ],
    },
    {
      id: "governing-law",
      title: "15. Governing law and disputes",
      paragraphs: [
        "These Terms are governed by applicable laws without regard to conflict-of-law principles. Any dispute will be resolved in the courts or forums permitted by applicable law, unless mandatory consumer protection rules in your country require otherwise.",
      ],
    },
    {
      id: "contact",
      title: "16. Contact",
      paragraphs: [
        `Questions about these Terms? Email ${CONTACT_EMAIL} or visit ${SITE_URL}/feedback.`,
      ],
    },
  ],
};
