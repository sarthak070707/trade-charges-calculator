import { useState, useMemo } from "react";
import { calculateCharges, CHARGE_INFO, DEFAULT_RATES } from "./calc";

// ---------------------------------------------------------------------------
// EDIT THESE TWO LINES — required by the task (your real, reachable contact).
const CREATOR_NAME = "Sarthak Arya";
const CREATOR_EMAIL = "sarthakarya4@gmail.com";
// ---------------------------------------------------------------------------

const inr = (n) =>
  "₹" +
  Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const signed = (n) => (n < 0 ? "−" : "") + inr(n);

export default function App() {
  const [segment, setSegment] = useState("intraday");
  const [exchange, setExchange] = useState("NSE");
  const [buyPrice, setBuyPrice] = useState("100");
  const [sellPrice, setSellPrice] = useState("102");
  const [quantity, setQuantity] = useState("100");
  const [openInfo, setOpenInfo] = useState(null);

  const result = useMemo(() => {
    const b = parseFloat(buyPrice) || 0;
    const s = parseFloat(sellPrice) || 0;
    const q = parseInt(quantity, 10) || 0;
    return calculateCharges({
      segment,
      exchange,
      buyPrice: b,
      sellPrice: s,
      quantity: q,
      rates: DEFAULT_RATES,
    });
  }, [segment, exchange, buyPrice, sellPrice, quantity]);

  const profit = result.netPnl >= 0;
  const hasTrade = result.turnover > 0;

  const rows = [
    ["brokerage", result.breakdown.brokerage],
    ["stt", result.breakdown.stt],
    ["transaction", result.breakdown.transaction],
    ["sebi", result.breakdown.sebi],
    ["stamp", result.breakdown.stamp],
    ["gst", result.breakdown.gst],
    ["dp", result.breakdown.dp],
  ];

  return (
    <div className="page">
      <header className="masthead">
        <div className="mark">
          <span className="mark-glyph">₹</span>
          <div>
            <h1>The Real Cost</h1>
            <p className="tagline">
              What a trade actually costs you on Indian exchanges — every fee,
              tax and charge, explained.
            </p>
          </div>
        </div>
      </header>

      <main className="grid">
        {/* ---------------- INPUTS ---------------- */}
        <section className="panel inputs" aria-label="Trade details">
          <div className="seg-toggle" role="tablist" aria-label="Trade type">
            {["intraday", "delivery"].map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={segment === s}
                className={segment === s ? "seg on" : "seg"}
                onClick={() => setSegment(s)}
              >
                {s === "intraday" ? "Intraday" : "Delivery"}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field-label">Buy price (per share)</span>
            <div className="input-wrap">
              <span className="prefix">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={buyPrice}
                min="0"
                onChange={(e) => setBuyPrice(e.target.value)}
              />
            </div>
          </label>

          <label className="field">
            <span className="field-label">Sell price (per share)</span>
            <div className="input-wrap">
              <span className="prefix">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={sellPrice}
                min="0"
                onChange={(e) => setSellPrice(e.target.value)}
              />
            </div>
          </label>

          <label className="field">
            <span className="field-label">Quantity (shares)</span>
            <div className="input-wrap">
              <input
                type="number"
                inputMode="numeric"
                value={quantity}
                min="0"
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </label>

          <div className="field">
            <span className="field-label">Exchange</span>
            <div className="pill-row">
              {["NSE", "BSE"].map((x) => (
                <button
                  key={x}
                  className={exchange === x ? "pill on" : "pill"}
                  onClick={() => setExchange(x)}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>

          <p className="assumption">
            Modelled on a discount broker's published rates (FY 2025-26). Charges
            shown are estimates — confirm against your own broker's contract note.
          </p>
        </section>

        {/* ---------------- RECEIPT ---------------- */}
        <section className="panel receipt" aria-label="Charge breakdown">
          <div className="receipt-top">
            <div className="result-eyebrow">
              {hasTrade
                ? `Net profit / loss after charges`
                : "Enter a trade to see the breakdown"}
            </div>
            <div className={`net ${profit ? "net-up" : "net-down"}`}>
              {hasTrade ? signed(result.netPnl) : "—"}
            </div>
            {hasTrade && (
              <div className="gross-line">
                Gross P&amp;L {signed(result.grossPnl)} · charges ate{" "}
                {inr(result.totalCharges)}
              </div>
            )}
          </div>

          <div className="perf" aria-hidden="true">
            <span></span>
          </div>

          <ul className="lines">
            {rows.map(([key, value]) => {
              const info = CHARGE_INFO[key];
              const dimmed = value === 0;
              const isOpen = openInfo === key;
              return (
                <li key={key} className={dimmed ? "line dim" : "line"}>
                  <div className="line-main">
                    <button
                      className="line-name"
                      onClick={() => setOpenInfo(isOpen ? null : key)}
                      aria-expanded={isOpen}
                    >
                      {info.label}
                      <span className="q">{isOpen ? "–" : "?"}</span>
                    </button>
                    <span className="leader" aria-hidden="true" />
                    <span className="line-amt">{inr(value)}</span>
                  </div>
                  {isOpen && <p className="line-info">{info.what}</p>}
                </li>
              );
            })}
          </ul>

          <div className="total-row">
            <span>Total charges</span>
            <span>{inr(result.totalCharges)}</span>
          </div>

          {hasTrade && (
            <div className="insight">
              <div className="insight-num">
                {inr(result.breakevenPerShare)}
              </div>
              <p>
                The price has to move at least this much{" "}
                <strong>per share</strong> before you make a single rupee — that's
                the charges working against you, win or lose. They come to{" "}
                {result.chargesPctOfTurnover.toFixed(3)}% of your turnover.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <div className="credits">
          <span className="built-by">Built by {CREATOR_NAME}</span>
          <a href={`mailto:${CREATOR_EMAIL}`} className="email">
            {CREATOR_EMAIL}
          </a>
        </div>
        <a
          className="dh-button"
          href="https://digitalheroesco.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Built for Digital Heroes
        </a>
      </footer>
    </div>
  );
}
