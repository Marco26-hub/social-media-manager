# 🤖 Complete Agent Automation Schedule

> ⚠️ **STATO 2026-07-07 — DOCUMENTO PROGETTUALE, NON IMPLEMENTATO IN PRODUZIONE.**
> Questo schedule descrive l'architettura target multi-agente. In produzione oggi
> è implementato SOLO `prospect-scraper` (`app/api/agents/prospect-scraper/route.ts`,
> ancora con dati simulati) e nessun `type: cron` è configurato su Render.
> Gli agenti weekly qui elencati sono **roadmap** finché non saranno riscritti sullo
> stack reale (Neon + `lib/db.ts q()`, no Supabase), callable via Bearer `CRON_SECRET`,
> e schedulati in `render.yaml`. Le feature venduta nei pacchetti (`lib/pacchetti.ts`)
> NON menzionano automazioni settimanali autonome: report/audit sono human-in-the-loop.
> Non promettere cron agli utenti finché non esistono davvero.

## Sistema Automatico Completo Social Automation V2

Social Automation V2 è un **sistema multi-agente completamente automatizzato** che gestisce:
- Content generation (5 opzioni giornaliere)
- Lead generation & scoring
- SEO optimization & analysis
- ADS performance monitoring
- Competitor intelligence
- Weekly client reporting

---

## 📅 Weekly Automation Timeline

```
┌─ DOMENICA ─────────────────────────────────────────┐
│                                                      │
│  🌅 6:00 AM - LEAD SCRAPER AGENT                   │
│    → Scrapa da: Google, Instagram, TikTok,         │
│      Facebook, Competitor Websites, Marketplace    │
│    → Categorizza: CALDO (70-100), TIEPIDO (40-69), │
│      FREDDO (0-39)                                 │
│    → Output: Salva lead nel DB (status=PENDING)    │
│    → Email: Report settimanale con lead count      │
│                                                      │
│  🌅 6:00 AM - CONTENT GENERATORS                   │
│    → Genera 5 opzioni di contenuto (Reel, Story,   │
│      Carousel, Educational, Promo)                 │
│    → Output: Salva in content_queue (status=PENDING)│
│                                                      │
│  🌆 6:30 PM - CLIENT REPORT AGENT                  │
│    → Compila: Vendite, Content Performance,        │
│      Lead count, SEO changes, ADS ROI              │
│    → Genera: 3-5 top opportunities                 │
│    → Email: Report settimanale completo            │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─ LUNEDI ─────────────────────────────────────────────┐
│                                                      │
│  🌅 7:15 AM - SEO + GEO AGENT                      │
│    → Analizza: SEO audit (score, keywords, traffic)│
│    → Analizza: GEO per città target                │
│    → Genera: Raccomandazioni prioritarie           │
│    → Output: Salva audit + geo + recommendations   │
│    → Email: "SEO Report Ready - Review in dashboard"│
│                                                      │
└──────────────────────────────────────────────────────┘

┌─ MARTEDI ────────────────────────────────────────────┐
│                                                      │
│  🌅 6:00 AM - CONTENT GENERATORS                   │
│  🌅 8:00 AM - ADS OPTIMIZER AGENT                  │
│    → Monitora: Google Ads, Meta Ads, TikTok Ads   │
│    → Calcola: CTR, CPC, CPA, ROAS                  │
│    → Analizza: 7-day trend                         │
│    → Genera: Optimization suggestions              │
│    → Alert: Email se problemi HIGH priority        │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─ MERCOLEDI ──────────────────────────────────────────┐
│                                                      │
│  🌅 6:00 AM - CONTENT GENERATORS                   │
│  🌅 7:30 AM - COMPETITOR WATCHER AGENT             │
│    → Monitora: 3-5 competitor per client           │
│    → Detects: Price drops, ranking changes,        │
│      follower spikes, new campaigns, products      │
│    → Threat level: LOW, MEDIUM, HIGH               │
│    → Email: Alert se minacce competitive           │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─ GIOVEDI ────────────────────────────────────────────┐
│                                                      │
│  🌅 6:00 AM - CONTENT GENERATORS                   │
│  🌅 8:00 AM - ADS OPTIMIZER AGENT                  │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─ VENERDI ────────────────────────────────────────────┐
│                                                      │
│  🌅 6:00 AM - CONTENT GENERATORS                   │
│  🌅 8:00 AM - ADS OPTIMIZER AGENT                  │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─ SABATO ─────────────────────────────────────────────┐
│                                                      │
│  🌅 6:00 AM - CONTENT GENERATORS                   │
│  🌅 8:00 AM - ADS OPTIMIZER AGENT                  │
│  🌆 9:00 PM - FEEDBACK LOOP (Analytics)            │
│    → Scarica engagement da Blotato                 │
│    → Salva performance metrics                     │
│    → Genera insights per prossima settimana        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🎯 6 Agenti Automatici

### 1️⃣ **CONTENT GENERATION AGENT** 
- **Frequenza:** Giornaliero 6:00 AM
- **Fa:** Genera 5 opzioni di contenuto (Reel, Story, Carousel, Educational, Promo)
- **Output:** content_queue (status=PENDING) → Tu approvi → Pubblica automatico
- **Database:** strategic_plans, editorial_plans, content_queue, published_content

### 2️⃣ **LEAD SCRAPER AGENT**
- **Frequenza:** Domenica 6:00 AM
- **Fa:** Scrapa lead da TUTTI (Google, Social, Competitors, Marketplace)
- **Categorizza:** CALDO/TIEPIDO/FREDDO (temperature-based)
- **Output:** scraped_leads (status=PENDING) → Tu flaggi/approvi
- **Database:** scraped_leads, lead_sources, lead_actions

### 3️⃣ **SEO + GEO AGENT**
- **Frequenza:** Lunedì 7:15 AM
- **Fa:** Analizza SEO (keywords, traffic, issues) + GEO (local ranking, GMB)
- **Genera:** Raccomandazioni prioritarie (TECHNICAL, CONTENT, BACKLINKS, LOCAL)
- **Output:** seo_audits, geo_analysis, seo_recommendations (status=PENDING)
- **Database:** seo_audits, geo_analysis, seo_recommendations

### 4️⃣ **ADS OPTIMIZER AGENT**
- **Frequenza:** Giornaliero 8:00 AM (escl. domenica)
- **Fa:** Monitora Google Ads, Meta Ads, TikTok Ads
- **Calcola:** CTR, CPC, CPA, ROAS + analizza trend 7 giorni
- **Genera:** Optimization suggestions (bid adjust, pause underperformers, scale winners)
- **Output:** ads_daily_performance + optimization_suggestions
- **Alert:** Email se problemi HIGH priority

### 5️⃣ **COMPETITOR WATCHER AGENT**
- **Frequenza:** Mercoledì 7:30 AM
- **Fa:** Monitora 3-5 competitor per client
- **Detects:** Price drops, ranking changes, follower spikes, new campaigns
- **Threat Level:** LOW, MEDIUM, HIGH
- **Output:** competitor_tracking + competitor_changes
- **Alert:** Email se minacce HIGH priority

### 6️⃣ **CLIENT REPORT AGENT**
- **Frequenza:** Domenica 6:30 PM
- **Fa:** Compila report settimanale completo
- **Include:** Vendite, Content Performance, Leads, SEO changes, ADS ROI
- **Genera:** Top 3-5 opportunities per la settimana prossima
- **Output:** client_reports + Email settimanale al cliente
- **Metriche:** ROI estimate per canale (social, SEO, ADS)

---

## 📊 Daily User Flow

### Morning (6:00 AM)
```
↓ Content generators run
↓ 5 new content options saved to dashboard
↓ Notification: "5 new posts ready for approval"
```

### Throughout the day
```
↓ You: Open dashboard
↓ You: See 5 content options (hook/body/CTA ready)
↓ You: 1-click approve → auto-publishes to Blotato
↓ You: 2-3 minutes total per post
```

### Evening
```
↓ 2 sec after approval: Content goes live
↓ Next day 9 PM: Engagement metrics come in
↓ Analytics update with performance data
```

### Weekly (Specific Days)
```
Sunday: Lead scraper runs + Client report sent
Monday: SEO/GEO analysis ready
Wednesday: Competitor threats detected
Daily: ADS performance monitored
```

---

## 🎛️ Dashboard Views

You see everything on ONE page:

```
┌─ DASHBOARD ────────────────────────────────────────┐
│                                                     │
│ 📱 PENDING CONTENT (5 options)                     │
│    [🎬 Reel] [📊 Carousel] [📖 Story] [📚 Edu] [🎁 Promo]
│    ✅ Approve & Publish | ❌ Reject               │
│                                                     │
│ 👥 PENDING LEADS (from this week)                  │
│    CALDO (15) | TIEPIDO (8) | FREDDO (22)         │
│    Filter & Flag or Approve                       │
│                                                     │
│ 📊 SEO RECOMMENDATIONS (from Monday)               │
│    ✅ HIGH: Optimize page speed (+120 traffic)   │
│    ✅ MEDIUM: Create content (+250 traffic)      │
│    [Approve & Implement] x5                       │
│                                                     │
│ 💰 ADS PERFORMANCE (real-time)                    │
│    Google Ads: ROAS 2.1x | Meta: ROAS 1.8x       │
│    ⚠️ HIGH: TikTok CPA too high - Optimize bid   │
│                                                     │
│ 🚨 COMPETITOR ALERTS (from Wednesday)             │
│    ⚠️ HIGH: Competitor A dropped price 15%       │
│    ⚠️ MEDIUM: Competitor B gained 1000 followers │
│                                                     │
│ 📈 WEEKLY REPORT                                   │
│    Revenue: €2,450 | Growth: +8.5%                │
│    Content: 7 posts | Reach: 45k                  │
│    Leads: 45 (18 CALDO) | ROI estimate: +25%    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Information Flows

```
CONTENT GENERATION
  Strategic Plan (monthly)
  ↓
  Editorial Plan (weekly, 28 days)
  ↓
  Content Generators (daily, 5 options)
  ↓
  Content Queue (dashboard approval)
  ↓
  Blotato Publish (live)
  ↓
  Performance Analytics (daily)
  ↓
  Feedback Loop → next week's editorial

LEAD GENERATION
  Lead Scraper (weekly, all sources)
  ↓
  Scraped Leads (dashboard review)
  ↓
  You: Flag/Approve
  ↓
  Lead Actions (email sent, call made, etc)
  ↓
  Track: Temperature change, purchased status

SEO OPTIMIZATION
  SEO Audit (weekly)
  ↓
  GEO Analysis (per target city)
  ↓
  Recommendations (generated)
  ↓
  You: Approve & Implement
  ↓
  Track: Actual impact (traffic gained)

ADS MANAGEMENT
  ADS Performance (daily collection)
  ↓
  Analysis & Optimization (daily)
  ↓
  Suggestions (if needed)
  ↓
  You: Review & Implement
  ↓
  Track: ROAS improvement

COMPETITIVE INTELLIGENCE
  Competitor Snapshots (weekly)
  ↓
  Change Detection (compare week to week)
  ↓
  Threat Assessment
  ↓
  You: Review Actions (if HIGH threat)
  ↓
  Execute Counter-Strategy

CLIENT REPORTING
  All metrics compiled (weekly)
  ↓
  ROI calculated per channel
  ↓
  Opportunities generated
  ↓
  Email sent to client
  ↓
  Client dashboard updated
```

---

## 🚀 Time Saved Per Week

| Task | Manual | Automated | Saved |
|------|--------|-----------|-------|
| Content generation | 2h/day × 5 = 10h | 5 min approve | **9.5h** |
| Lead scraping | 3h | 0 | **3h** |
| SEO analysis | 4h | 0 | **4h** |
| ADS monitoring | 1h/day × 5 = 5h | 0 (alerts only) | **5h** |
| Competitor tracking | 2h | 0 | **2h** |
| Client reporting | 3h | 0 | **3h** |
| **TOTAL** | **~27 hours** | **~5 min/day** | **~27 hours saved** |

---

## 📝 Notes

- **All data scoped by cliente_id** - Multi-client safe
- **RLS policies enforce security** - Users only see their own data
- **Service role for agents** - Automated writes
- **User role for approvals** - Human control maintained
- **Scheduled tasks run in background** - No manual triggering needed
- **Email alerts sent automatically** - Only HIGH priority issues
- **Mock data for demo** - Replace with real APIs in production

---

## 🎯 Key Principle

**Agenti fanno il lavoro, Tu approvi i risultati.**

Non è hands-off. È hands-smart:
- ✅ Spend 5 min/day approving content
- ✅ Spend 30 min/week reviewing leads, SEO, competitors
- ✅ Receive weekly client report automatically
- ✅ Get alerts only for high-priority issues

**Before:** 27 hours/week managing everything manually  
**After:** 5 hours/week on approvals + strategy
