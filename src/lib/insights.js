// Sample data for the brand dashboard in Demo Mode. Same shape as the SQL function brand_insights() returns.
// These numbers are illustrative, not real customers. They echo the patterns from the Part 1 interviews.
export const SAMPLE = {
  users: 84, enough: true,
  sources: [{ k: 'amazon', n: 49 }, { k: 'company_site', n: 18 }, { k: 'flipkart', n: 9 }, { k: 'offline', n: 8 }],
  reasons: [{ k: 'price', n: 21 }, { k: 'felt_done', n: 14 }, { k: 'side_effect', n: 12 }, { k: 'switched', n: 7 }, { k: 'paused', n: 6 }],
  retention: [{ week: 4, pct: 0.86, n: 84 }, { week: 8, pct: 0.64, n: 71 }, { week: 12, pct: 0.47, n: 52 }, { week: 16, pct: 0.33, n: 31 }],
  early_effects: { pct: 0.31, n: 66 },
  noticed: [{ week: 0, avg: 1.1 }, { week: 2, avg: 1.2 }, { week: 4, avg: 1.5 }, { week: 6, avg: 1.9 }, { week: 8, avg: 2.2 }, { week: 10, avg: 2.6 }, { week: 12, avg: 3.0 }, { week: 14, avg: 3.2 }],
}
