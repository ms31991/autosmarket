import {
  LEGAL_ADDRESS,
  LEGAL_NAME,
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
} from "../config/site";

export const LEGAL_UPDATED = "24 September 2026";
export { SUPPORT_EMAIL, PRIVACY_EMAIL };

export function getLegalPages({
  legalName = LEGAL_NAME,
  legalAddress = LEGAL_ADDRESS,
  supportEmail = SUPPORT_EMAIL,
  privacyEmail = PRIVACY_EMAIL,
} = {}) {
  return {
  privacy: {
    title: "Privacy Policy",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          `${legalName} (“we”, “us”) operates the AutoMarket vehicle marketplace. This policy explains what personal data we collect, why we collect it, and how you can exercise your rights.`,
          ...(legalAddress ? [`Publisher address: ${legalAddress}.`] : []),
          `For privacy requests contact ${privacyEmail}. For general support contact ${supportEmail}.`,
        ],
      },
      {
        heading: "What we collect",
        paragraphs: [
          "We collect only what we need to run the marketplace:",
          "Account: name, email, and optional phone number and profile photo. Sign-in is provided by Clerk, which stores authentication credentials on our behalf.",
          "Listings: vehicle details you choose to publish (for example brand, model, price, year, location, photos, and optional technical fields). Vehicle identification numbers (VIN) are optional. Do not add VIN or other identifiers unless you want them stored with your listing.",
          "Messages, favourites, and notifications needed to use those features.",
          "Payments for listing promotion: amount, status, and identifiers from Stripe. We do not store full card numbers.",
          "Technical logs that keep the service secure (for example date, IP address, and error information).",
        ],
      },
      {
        heading: "What we do not collect",
        paragraphs: [
          "We do not sell personal data.",
          "Google AdSense may run only after you accept advertising cookies in the cookie banner. Until then we do not load Google ads scripts.",
          "We do not load Google Analytics unless we later add it and update this policy.",
        ],
      },
      {
        heading: "Why we use data",
        paragraphs: [
          "To create and secure your account (contract and legitimate interests in security).",
          "To publish listings, show search results, and let users contact each other (contract).",
          "To process promotion payments through Stripe (contract).",
          "To show Google ads if you consent (consent). Google may use cookies and similar technology to serve and measure ads, including personalised ads where allowed.",
          "To meet legal duties such as accounting, fraud prevention, and responding to lawful requests.",
        ],
      },
      {
        heading: "Processors",
        paragraphs: [
          "Clerk authenticates users and may set cookies that are required to sign in.",
          "Stripe processes promotion payments. Card details are entered on Stripe’s payment form or Stripe Checkout, not stored in AutoMarket’s database.",
          "Google Ireland Limited (and Google LLC) process data for AdSense if you accept advertising cookies. See Google’s advertising privacy information and ads settings.",
          "Hosting and database providers store the application and listing data.",
          "These providers may process data outside your country. We use them only to operate the service or, for ads, after your consent.",
        ],
      },
      {
        heading: "How long we keep data",
        paragraphs: [
          "Account and listing data is kept while your account is open and for a limited time afterwards if we must keep records (for example payments or disputes).",
          "You may update your profile in Settings and request deletion of your account. Listings and messages you sent may remain visible to the other party until they are removed in line with this policy and the law.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Depending on where you live (including the EU/EEA, Albania, and Kosovo), you may have rights to access, correct, delete, restrict, or object to processing, and to data portability.",
          `Write to ${privacyEmail}. We aim to respond within 30 days. You may also complain to your local data protection authority.`,
        ],
      },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "Agreement",
        paragraphs: [
          "By creating an account or using AutoMarket you agree to these terms, the Privacy Policy, Cookie Policy, and Refund Policy. If you do not agree, do not use the service.",
          "You must be at least 18 years old and able to enter a contract.",
        ],
      },
      {
        heading: "The platform",
        paragraphs: [
          "AutoMarket connects people who want to buy, sell, or rent vehicles. Unless a listing clearly says otherwise, AutoMarket is not the seller or lessor of the vehicle.",
          "Contracts of sale or rental are between users. You must follow vehicle, tax, consumer, and advertising laws that apply to you.",
        ],
      },
      {
        heading: "Listings and conduct",
        paragraphs: [
          "You are responsible for the accuracy of photos, price, mileage, condition, and legal right to sell or rent the vehicle.",
          "Do not list stolen vehicles, illegal content, scams, or another person’s private data. We may remove content or suspend accounts if we reasonably believe these terms or the law have been broken.",
        ],
      },
      {
        heading: "Paid promotions",
        paragraphs: [
          "Optional listing promotion is a paid digital service described at checkout. Payment is handled by Stripe. Refunds are described in the Refund Policy.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "The service is provided as available. To the extent the law allows, we are not liable for deals between users, vehicle condition, or outages outside our reasonable control.",
          "Nothing in these terms limits rights that cannot be waived under consumer law.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "Cookie consent",
        paragraphs: [
          "A banner asks you to accept or reject cookies. You can change this later from Cookies in the footer.",
          "Some cookies are needed to sign you in, keep the service secure, and remember your cookie choice.",
        ],
      },
      {
        heading: "Cookies and storage we use",
        paragraphs: [
          "Clerk (sign-in): session and security cookies required to authenticate you.",
          "Stripe: loaded only when you start a promotion payment.",
          "If you choose Accept cookies, advertising cookies (including Google AdSense when it is enabled) may run. If you choose Reject, those advertising cookies do not load.",
          "Local storage: essential app state (for example language and cookie choice) and optional chat pins.",
        ],
      },
      {
        heading: "Your controls",
        paragraphs: [
          "Use the cookie banner, Cookies in the footer, or your browser settings. Blocking essential cookies will stop login and payments from working.",
        ],
      },
    ],
  },
  refunds: {
    title: "Refund Policy",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "What this policy covers",
        paragraphs: [
          "This policy applies only to money you pay AutoMarket for listing promotion (advertisement packages) through Stripe.",
          "AutoMarket does not take payment for the vehicle itself. Refunds for a car sale or rental are a matter between the buyer and seller, not AutoMarket.",
        ],
      },
      {
        heading: "EU consumer cooling-off",
        paragraphs: [
          "If you are a consumer in the EU/EEA buying promotion as a distance contract, you may have a 14-day right of withdrawal from the day of purchase.",
          "Promotion starts as soon as payment succeeds. If you ask us to start the service immediately, you may lose the withdrawal right once the service has been fully performed. Checkout asks you to confirm this.",
        ],
      },
      {
        heading: "When we refund",
        paragraphs: [
          "We refund if payment was taken in error, the promotion was not delivered, or the law requires a refund.",
          "We generally do not refund after a promotion has run for the purchased period, except where consumer law says otherwise.",
        ],
      },
      {
        heading: "How to request a refund",
        paragraphs: [
          `Email ${supportEmail} with your account email, approximate payment date, and Stripe receipt if you have it. We aim to reply within 14 days. Approved refunds are sent back through Stripe to the original payment method.`,
        ],
      },
    ],
  },
  about: {
    title: "About AutoMarket",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "What AutoMarket is",
        paragraphs: [
          `${legalName} operates AutoMarket, a marketplace for buying, selling, and renting vehicles. You can publish listings, save favourites, and message other users.`,
          ...(legalAddress
            ? [`Registered / postal address: ${legalAddress}.`]
            : [`Contact: ${supportEmail}.`]),
          "Your public profile shows your name, photo, and vehicles you have listed. Saved vehicles are private to you.",
          "We publish original guides on buying, documents, scams and listing photos. User listings are moderated when they are reported.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "How to reach us",
        paragraphs: [
          `Publisher: ${legalName}`,
          ...(legalAddress ? [`Address: ${legalAddress}`] : []),
          `Support: ${supportEmail}`,
          `Privacy: ${privacyEmail}`,
          "We aim to respond to account and privacy requests within 30 days.",
        ],
      },
    ],
  },
  guidelines: {
    title: "Community Guidelines",
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: "Rules",
        paragraphs: [
          "List only vehicles you are entitled to sell or rent. Use real photos and truthful mileage, price, and condition.",
          "Be respectful in messages. Harassment, hate speech, scams, and spam are not allowed.",
          "Do not share another person’s private data. Do not impersonate AutoMarket staff.",
          "Report suspicious listings from the vehicle page. We may remove content and suspend accounts that break these rules.",
        ],
      },
    ],
  },
  };
}

export const LEGAL_PAGES = getLegalPages();

