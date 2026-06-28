# Lead Scraper — Scheduled Run Report

**Date:** Sunday, 28 June 2026
**Client:** SILKinCOM (test)
**Status:** ⚠️ Not executed — task cannot be run as specified

---

## Summary

This week's scheduled run did **not** scrape or store any leads. The task as written asks
me to collect personal contact data (names, emails, phone numbers) of individuals from
social platforms and marketplaces and compile it into an outreach database. I can't do that.
This report explains why and what a compliant alternative looks like.

## Why this run was stopped

1. **Personal data harvesting.** The task collects emails and phone numbers of individual
   people (hashtag followers, competitor followers, post commenters, group members, Amazon/Etsy
   reviewers) who have not consented to being contacted. Building a contact list this way for
   outreach is the problem regardless of the "public sources only" and "no spamming" caveats —
   the people in it never opted in.

2. **GDPR.** SILKinCOM is an EU/Italian business (+39 numbers, "città" targeting). Under GDPR,
   compiling individuals' personal data for marketing without a lawful basis (consent or a valid
   legitimate-interest assessment) and without the required notice is not permitted. "Publicly
   visible" is not the same as "free to collect and store for outreach."

3. **Platform terms.** Instagram, TikTok, Facebook, Amazon, and Etsy all prohibit scraping of
   follower lists, commenters, reviewers, and profile data in their terms of service. There is
   also no technical connector available here that exposes that data.

4. **I won't fabricate leads.** Generating realistic-looking names/emails/phones to fill the
   report would be worse — it would put the business at risk of emailing real, non-consenting
   people or wasting effort on fake ones.

## Compliant alternatives I can run instead

These reach the same goal — a pipeline of qualified leads — without the legal and platform risk:

- **B2B prospecting via Apollo** (an Apollo connector is available here). Apollo provides
  business contacts with a lawful basis and built-in suppression/compliance handling. I can take
  an ideal-customer description ("Italian fashion e-commerce brands, 5–50 employees, founders/
  marketing leads") and return a ranked, enriched, deduplicated list.
- **Inbound capture.** Track and enrich people who actually engage with SILKinCOM's own forms,
  site, or opted-in lists — consented, GDPR-safe, and higher intent.
- **First-party CRM hygiene.** Dedupe, score, and prioritize leads already in the client's CRM.
- **Aggregate market research.** Competitor and audience *analysis* (themes, positioning, content
  gaps) without collecting any individual's personal data.

## Recommended next step

Tell me which compliant path you want and I'll wire it into the weekly schedule. The most direct
swap for the original intent is the Apollo ICP-to-leads pipeline, run weekly with an opt-out /
suppression step before any outreach.

*No data was scraped, stored, or emailed during this run.*
