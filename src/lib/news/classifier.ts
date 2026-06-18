import type {
  NewsClassification,
  NewsFactor,
  NewsTheme,
} from '@/types/market';
import { clamp, deriveTimeDecay } from '@/lib/news/decay';
import {
  createSignalMap,
  finalizeSignals,
  mergeSignal,
  propagateFactorsToAssets,
} from '@/lib/news/graph';

type Direction = -1 | 0 | 1;

interface Rule {
  pattern: RegExp;
  theme: NewsTheme;
  relevance: number;
  factors: Partial<Record<NewsFactor, Direction>>;
}

const RULES: Rule[] = [
  {
    pattern: /\b(fed|fomc|powell|federal reserve|interest rates?|rate (?:hike|cut|decision))\b/i,
    theme: 'monetary_policy',
    relevance: 0.9,
    factors: { rates_us: 0, usd: 0, risk: 0 },
  },
  {
    pattern: /\b(selic|copom|banco central do brasil|bcb|campos neto|galipolo)\b/i,
    theme: 'monetary_policy',
    relevance: 1,
    factors: { rates_br: 0, brl: 0, risk: 0 },
  },
  {
    pattern: /\b(inflation|consumer prices?|cpi|pce|ipca|prices? pressure)\b/i,
    theme: 'inflation',
    relevance: 0.9,
    factors: { inflation: 0, rates_us: 0, rates_br: 0 },
  },
  {
    pattern: /\b(gdp|economic growth|recession|economic activity|industrial production|retail sales)\b/i,
    theme: 'growth',
    relevance: 0.8,
    factors: { growth: 0, risk: 0, rates_us: 0 },
  },
  {
    pattern: /\b(payrolls?|employment|unemployment|jobless|labor market|wages?)\b/i,
    theme: 'labor',
    relevance: 0.75,
    factors: { growth: 0, inflation: 0, rates_us: 0 },
  },
  {
    pattern: /\b(fiscal|budget|debt ceiling|government spending|primary deficit|public debt)\b/i,
    theme: 'fiscal',
    relevance: 0.8,
    factors: { rates_br: 0, rates_us: 0, risk: 0, brl: 0 },
  },
  {
    pattern: /\b(war|attack|missile|sanctions?|geopolitic|conflict|invasion|blockade|hormuz)\b/i,
    theme: 'geopolitics',
    relevance: 0.85,
    factors: { risk: -1, energy: 1, defense: 1 },
  },
  {
    pattern: /\b(ceasefire|peace deal|peace agreement|deal to end|agreement to end|reopen(?:ing)? (?:of )?(?:the )?(?:strait of )?hormuz|hormuz reopen(?:s|ed|ing)?|tankers? resum(?:e|es|ed|ing)|blockade (?:eased|lifted|ends?|ended))\b/i,
    theme: 'geopolitics',
    relevance: 0.95,
    factors: { risk: 1, energy: -1, defense: -1 },
  },
  {
    pattern: /\b(oil|crude|brent|wti|opec|natural gas|petroleum)\b/i,
    theme: 'energy',
    relevance: 0.85,
    factors: { energy: 0, inflation: 0, risk: 0 },
  },
  {
    pattern: /\b(gold|copper|iron ore|metals?|mining)\b/i,
    theme: 'metals',
    relevance: 0.75,
    factors: { metals: 0, growth: 0, risk: 0 },
  },
  {
    pattern: /\b(soy|soybeans?|corn|wheat|crop|agriculture|coffee|sugar)\b/i,
    theme: 'agriculture',
    relevance: 0.7,
    factors: { agriculture: 0, inflation: 0, brl: 0 },
  },
  {
    pattern: /\b(dollar|dxy|currency|currencies|forex|fx|real|brl|usd\/brl)\b/i,
    theme: 'fx',
    relevance: 0.75,
    factors: { usd: 0, brl: 0, risk: 0 },
  },
  {
    pattern: /\b(credit|spreads?|default|high yield|investment grade|banking stress)\b/i,
    theme: 'credit',
    relevance: 0.75,
    factors: { credit: 0, risk: 0 },
  },
  {
    pattern: /\b(ai|artificial intelligence|semiconductors?|chips?|data centers?|export controls?|advanced computing)\b/i,
    theme: 'equities',
    relevance: 0.8,
    factors: { technology: 0, growth: 0, risk: 0 },
  },
  {
    pattern: /\b(electricity|power demand|power grid|nuclear|uranium|generation capacity|data center power)\b/i,
    theme: 'energy',
    relevance: 0.8,
    factors: { power: 0, energy: 0, growth: 0 },
  },
  {
    pattern: /\b(defense spending|defence spending|military spending|weapons?|munitions?|pentagon|nato)\b/i,
    theme: 'geopolitics',
    relevance: 0.85,
    factors: { defense: 1, risk: -1 },
  },
  {
    pattern: /\b(stocks?|equities|s&p 500|spx|ibovespa|ibov|shares?)\b/i,
    theme: 'equities',
    relevance: 0.65,
    factors: { risk: 0, growth: 0 },
  },
  {
    pattern: /\b(tariffs?|trade war|exports?|imports?|trade deal)\b/i,
    theme: 'trade',
    relevance: 0.7,
    factors: { growth: 0, risk: 0, usd: 0 },
  },
];

const POSITIVE = /\b(rise[sn]?|rose|rally|rallies|gain[sed]*|higher|hotter|accelerat(?:e|es|ed|ing)|strong(?:er)?|hawkish|hike[sd]?|tighten(?:s|ed|ing)?|surge[sd]?|beat[sed]*|above)\b/i;
const NEGATIVE = /\b(fall[sn]?|fell|drop[sped]*|lower|cool(?:s|ed|ing)?|slow(?:s|ed|ing)?|weak(?:er)?|dovish|cut[st]?|eas(?:e|es|ed|ing)|recession|miss(?:es|ed)?|below|contract(?:s|ed|ing)?)\b/i;
const RISK_OFF = /\b(risk[- ]off|selloff|turmoil|crisis|fear|tensions?|uncertainty|default|downgrade)\b/i;
const RISK_ON = /\b(risk[- ]on|relief rally|optimism|soft landing|ceasefire|trade deal)\b/i;

function headlineDirection(title: string): Direction {
  const positive = POSITIVE.test(title);
  const negative = NEGATIVE.test(title);
  if (positive === negative) return 0;
  return positive ? 1 : -1;
}

export function classifyHeadline(
  title: string,
  publishedAt: Date,
  now: Date = new Date()
): NewsClassification {
  const themes = new Set<NewsTheme>();
  const factorSignals = createSignalMap();
  const direction = headlineDirection(title);
  let relevance = 0;
  let matchCount = 0;

  for (const rule of RULES) {
    if (!rule.pattern.test(title)) continue;
    themes.add(rule.theme);
    relevance = Math.max(relevance, rule.relevance);
    matchCount += 1;

    for (const [factor, fixedDirection] of Object.entries(rule.factors)) {
      const resolvedDirection = (fixedDirection === 0 ? direction : fixedDirection) as Direction;
      mergeSignal(factorSignals, factor, resolvedDirection, rule.relevance);
    }
  }

  if (RISK_OFF.test(title)) {
    themes.add('geopolitics');
    mergeSignal(factorSignals, 'risk', -1, 0.9);
    relevance = Math.max(relevance, 0.85);
    matchCount += 1;
  } else if (RISK_ON.test(title)) {
    mergeSignal(factorSignals, 'risk', 1, 0.85);
    relevance = Math.max(relevance, 0.8);
    matchCount += 1;
  }

  const factorList = finalizeSignals<NewsFactor>(factorSignals);
  const assetList = propagateFactorsToAssets(factorList);

  const { ageMinutes, halfLifeMinutes, decay } = deriveTimeDecay(themes, publishedAt, now);
  const hasDirection = factorList.some((signal) => signal.direction !== 0);
  const confidence = matchCount === 0
    ? 0
    : clamp(0.45 + Math.min(matchCount, 3) * 0.12 + (hasDirection ? 0.12 : 0));

  return {
    themes: [...themes],
    factors: factorList,
    assets: assetList,
    relevance: clamp(relevance),
    confidence,
    decay,
    ageMinutes,
    halfLifeMinutes,
  };
}
