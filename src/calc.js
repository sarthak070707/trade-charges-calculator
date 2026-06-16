// ---------------------------------------------------------------------------
// Indian equity charge logic (FY 2025-26, Zerodha-style discount-broker model)
//
// Every rate lives here and is also exposed in the UI so the numbers stay
// correct even when SEBI / the exchanges revise them. Tweak DEFAULT_RATES and
// the whole tool updates.
// ---------------------------------------------------------------------------

// All percentage rates are written as PERCENTAGES (e.g. 0.025 means 0.025%).
export const DEFAULT_RATES = {
  intraday: {
    brokeragePct: 0.03, // 0.03% per executed order...
    brokerageCap: 20, // ...capped at ₹20 per order
    sttPct: 0.025, // STT, sell side only
    sttBothSides: false,
    stampPct: 0.003, // stamp duty, buy side only
    dpPerScrip: 0, // no demat debit for intraday
  },
  delivery: {
    brokeragePct: 0, // most discount brokers: free delivery
    brokerageCap: 20,
    sttPct: 0.1, // STT, both sides
    sttBothSides: true,
    stampPct: 0.015, // stamp duty, buy side only
    dpPerScrip: 15.34, // CDSL + broker demat debit per scrip per day (incl GST)
  },
  // Shared across segments
  exchange: {
    NSE: 0.00297, // transaction charge %
    BSE: 0.00375,
  },
  sebiPct: 0.0001, // ₹10 per crore = 0.0001%
  gstPct: 18, // GST on (brokerage + transaction + SEBI)
};

const pct = (value, percentage) => (value * percentage) / 100;

export function calculateCharges({
  segment, // 'intraday' | 'delivery'
  exchange, // 'NSE' | 'BSE'
  buyPrice,
  sellPrice,
  quantity,
  rates = DEFAULT_RATES,
}) {
  const seg = rates[segment];
  const buyValue = buyPrice * quantity;
  const sellValue = sellPrice * quantity;
  const turnover = buyValue + sellValue;
  const grossPnl = sellValue - buyValue;

  // Brokerage — per leg, lower of (% of leg value) or the per-order cap.
  const legBrokerage = (legValue) =>
    seg.brokeragePct > 0
      ? Math.min(pct(legValue, seg.brokeragePct), seg.brokerageCap)
      : 0;
  const brokerage = legBrokerage(buyValue) + legBrokerage(sellValue);

  // STT — sell side only for intraday, both sides for delivery.
  const stt = seg.sttBothSides
    ? pct(turnover, seg.sttPct)
    : pct(sellValue, seg.sttPct);

  // Exchange transaction charge — on full turnover.
  const transaction = pct(turnover, rates.exchange[exchange]);

  // SEBI turnover fee — on full turnover.
  const sebi = pct(turnover, rates.sebiPct);

  // Stamp duty — buy side only.
  const stamp = pct(buyValue, seg.stampPct);

  // GST — on brokerage + transaction + SEBI.
  const gst = pct(brokerage + transaction + sebi, rates.gstPct);

  // DP / demat charges — delivery sells only, flat per scrip.
  const dp = seg.dpPerScrip;

  const totalCharges = brokerage + stt + transaction + sebi + stamp + gst + dp;
  const netPnl = grossPnl - totalCharges;

  // The teaching number: how far the price must move, per share, just to break
  // even on charges before you make a single rupee.
  const breakevenPerShare = quantity > 0 ? totalCharges / quantity : 0;
  const chargesPctOfTurnover = turnover > 0 ? (totalCharges / turnover) * 100 : 0;

  return {
    buyValue,
    sellValue,
    turnover,
    grossPnl,
    breakdown: { brokerage, stt, transaction, sebi, stamp, gst, dp },
    totalCharges,
    netPnl,
    breakevenPerShare,
    chargesPctOfTurnover,
  };
}

// Plain-language explanation for each line item — this is the "teach beginners"
// layer. Shown inline next to every charge.
export const CHARGE_INFO = {
  brokerage: {
    label: "Brokerage",
    what: "Your broker's fee for placing the order. Discount brokers charge a flat ₹20 (or 0.03%) per order, whichever is lower — and many keep delivery free.",
  },
  stt: {
    label: "STT",
    what: "Securities Transaction Tax, paid to the government. The big one: charged on the sell side for intraday, and on both sides for delivery. You pay it even on a losing trade.",
  },
  transaction: {
    label: "Exchange transaction",
    what: "A fee the exchange (NSE/BSE) charges on the value of every trade routed through it.",
  },
  sebi: {
    label: "SEBI turnover fee",
    what: "A tiny regulatory fee (₹10 per crore traded) that funds the market regulator, SEBI.",
  },
  stamp: {
    label: "Stamp duty",
    what: "A state-government tax on the transfer of securities, charged only on the buy side.",
  },
  gst: {
    label: "GST",
    what: "18% Goods & Services Tax, applied on top of brokerage, transaction and SEBI fees.",
  },
  dp: {
    label: "DP (demat) charges",
    what: "A flat fee the depository (CDSL/NSDL) and broker charge when you sell shares from your demat account. Delivery only — intraday never touches your demat.",
  },
};
