# Making this an unofficial, unbranded app — legal/branding guide

**Not legal advice.** This is a plain-language summary of how unofficial companion apps generally stay on the right side of trademark and copyright law and Apple's rules. It is research, not a legal opinion. For anything you're betting real money or liability on, have an IP attorney review it.

---

## The one thing to understand first: there are TWO separate legal problems

People lump "can I make an unofficial Brewery Art Walk app?" into one question. It's actually two, and they have different answers.

**Problem 1 — Trademark (the NAME and look).** This is about consumer confusion: is your app pretending to be them, or implying they endorsed it? Fixable with how you name and present the app.

**Problem 2 — Copyright (the CONTENT).** This is about who owns the photos, the written bios, and the official map. A disclaimer does **nothing** for this. You either have a license to use the content or you don't — and you've told me the org won't give one.

Most "unofficial app" advice online only addresses Problem 1 and quietly ignores Problem 2. Problem 2 is the one that was actually going to get this app rejected or into trouble, because the current build bundles ~197 artist photos pulled from the org's website, copied bios, and the official campus map. That's why the plan strips that content.

---

## Problem 1: Trademark — how to use the name legally

You're allowed to *refer to* a trademarked name to say what your product is about. The doctrine is **nominative fair use**. Courts apply a three-part test:

1. The thing isn't reasonably identifiable without using the name (you can't describe "a guide to this specific art walk" without naming it).
2. You use **only as much of the mark as necessary** — the words, not the logo, not the stylized wordmark, not their colors.
3. Your use **doesn't suggest sponsorship or endorsement.**

The classic case is *Playboy v. Welles*: a former model could call herself a former "Playmate of the Year" because she didn't copy Playboy's logo or font and she posted a clear disclaimer of affiliation.

**What this means concretely for your app:**

- **Do NOT make "Brewery Art Walk" the app's name, icon text, or bundle ID.** Using the mark *as your brand* is the thing that crosses from "referring to them" into "impersonating them."
- **Pick a neutral, independent name** based on geography or function, e.g. "Lincoln Heights Studio Map." That's why the prompt has Claude Code propose new names.
- **Refer to the event once, factually, in plain text** to explain what the app is for — no logo, no stylized type, no official colors.
- **Add a clear disclaimer** (template below).

**On disclaimers — important nuance:** a disclaimer *helps* a nominative-fair-use argument but does **not** by itself make an infringing use legal. Its prominence, wording, and placement matter, and a disclaimer can't rescue a use that otherwise implies endorsement or copies protected content. Treat it as one necessary piece, not a magic shield.

**Suggested disclaimer text (use verbatim in the About panel and store listing):**

> This is an independent, unofficial guide. It is not affiliated with, endorsed by, sponsored by, or authorized by the Brewery Art Walk, the Brewery Arts Complex, or any artist listed. All studio and artist information is drawn from publicly available sources.

---

## Problem 2: Copyright — why the content has to be stripped

Copyright protects original creative expression. It does **not** protect facts, and it doesn't protect raw directory data just because someone worked hard to compile it. The governing case is *Feist v. Rural Telephone* (U.S. Supreme Court, 1991): a phone book's names, towns, and numbers were **not** copyrightable because facts aren't original to the compiler. Only original *creative expression* and an original *selection/arrangement* get protection.

Apply that to your data:

**You CAN keep (facts — not copyrightable):**

- Artist names
- Public studio addresses, unit numbers, building names
- Medium / category (painting, sculpture, etc.)
- Public website and Instagram URLs

**You must REMOVE (creative expression — copyrighted by the artist or org):**

- The ~197 **artist photos** scraped from the org's site
- The written **bios** / descriptive prose copied into `artists.json`
- The **official campus map** artwork and any direct trace of it (`Map.jpg`, `bw map.jpg`, `map_greyscale.jpg`, `template.svg`, etc.)

The app's own hand-drawn SVG schematic (rectangles for buildings, street labels) is your original work and the underlying building *positions* are facts, so that can stay — as long as it's genuinely your drawing and not an embedded copy of their map image. The prompt has Claude Code verify this.

This is the trade: by shipping **facts only**, you don't need anyone's permission. You lose the photos and bios; you keep a working, legal directory + map.

---

## Apple's rule: Guideline 5.2 (the unofficial-app trap)

This is Apple's own gate, separate from the law. **App Store Review Guideline 5.2.1** says apps must be submitted by someone who owns or has licensed the relevant IP, and that Apple may **require documentation of your relationship** with the brand/business an app is built around. Their stated resolution is blunt: either the owner submits it under their own account, **or** you provide documentation showing you're authorized.

You have neither. So understand the residual risk honestly:

- Stripping the content and de-branding the name **substantially lowers** your 5.2 exposure — there's no longer protected imagery, copied text, or a trademarked app name for a reviewer to catch.
- It does **not reduce the risk to zero.** An app whose entire purpose is clearly a companion to one specific named event can still draw a 5.2 inquiry, and Apple has wide discretion. Apple has also been tightening rules against copycat/unofficial apps.
- The single best thing you can do to de-risk review is **proactive review notes** telling the reviewer up front: it's an independent unofficial guide, it contains no third-party copyrighted images or text, it uses only public factual information, location is used only to show the user's dot on the map, and it claims no affiliation. The prompt has Claude Code draft these.

**The genuinely safest path** (for completeness, even though you've ruled it out): get written content authorization from the org or individual artists — even informal email permission — and keep it on file. That converts Problem 2 from "infringement" to "licensed" and gives Apple the 5.2 documentation it asks for. If the org's objection is only to an *official-branded* app, they may still be willing to grant *content permission* for an unofficial one. Worth asking; it's a separate question from branding.

---

## Bottom line

| Risk | Mitigation in this plan | Residual risk after |
|---|---|---|
| Trademark (impersonation) | New neutral name; nominative reference + disclaimer; no logo/colors/wordmark | Low |
| Copyright (photos, bios, map) | Strip all of it; rebuild on facts only; original schematic map | Low (you ship nothing you don't own) |
| Apple Guideline 5.2 | All of the above + proactive review notes | Reduced, not zero — Apple has discretion over event-companion apps |

If you want belt-and-suspenders: ask the org for written *content* permission even though they won't make it official. That's the only thing that takes the 5.2 risk close to zero.

---

## Sources

- [Nominative fair use — Wikipedia](https://en.wikipedia.org/wiki/Nominative_use)
- [Fair Use of Trademarks (non-legal audience) — International Trademark Association](https://www.inta.org/fact-sheets/fair-use-of-trademarks-intended-for-a-non-legal-audience/)
- [Fair use (U.S. trademark law) — Wikipedia (incl. Playboy v. Welles)](https://en.wikipedia.org/wiki/Fair_use_(U.S._trademark_law))
- [Feist Publications v. Rural Telephone Service Co., 499 U.S. 340 (1991) — Justia](https://supreme.justia.com/cases/federal/us/499/340/)
- [App Review Guidelines — Apple Developer (see 5.2 Intellectual Property)](https://developer.apple.com/app-store/review/guidelines/)
- [Apple's rules aimed at copycat/unofficial apps — iDropNews](https://www.idropnews.com/news/apples-new-app-store-rules-aim-to-stamp-out-copycat-apps/255514/)
- [Screenshot specifications — App Store Connect Help](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/)
