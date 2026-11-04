"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  FileCheck2,
  FileText,
  LockKeyhole,
  Menu,
  Play,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { Brand } from "@/components/shared/Brand";
import { useDataStore } from "@/stores/data-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { getSampleDataset } from "@/lib/analytics/sample-data";

const faqs = [
  [
    "Where does my financial data go?",
    "Your file is parsed and analysed in your browser. Vanguard does not upload your statement to a server. Closing or refreshing the page clears the loaded dataset.",
  ],
  [
    "Which files can I analyse?",
    "Upload a CSV, Excel workbook (.xlsx or .xls), or a text-based PDF bank statement, up to 50 MB. Scanned image PDFs need OCR first. Include a transaction date, description, and amount or debit/credit columns for best results.",
  ],
  [
    "Can I correct a transaction category?",
    "Yes. Open the transaction ledger and choose a new category for any transaction. Your charts and totals recalculate automatically. You can also separate transfers from operating cash flow.",
  ],
  [
    "How should I use the forecasts and scores?",
    "Use them as a starting point for investigation. Forecasts extrapolate historical balances; categories and anomaly flags are estimates. Always check the original statement before making a financial decision.",
  ],
];

export function LandingPage({ onStartUpload }: { onStartUpload: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const setDataset = useDataStore((s) => s.setDataset);
  const reset = useDashboardStore((s) => s.reset);
  const demo = () => {
    reset();
    setDataset(getSampleDataset());
  };
  return (
    <div className="landing">
      <header className="site-header page-width">
        <a href="#" aria-label="Vanguard home">
          <Brand />
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#workflow">How it works</a>
          <a href="#privacy">Your privacy</a>
          <a href="#faq">FAQs</a>
        </nav>
        <div className="header-actions">
          <button className="text-button demo-nav" onClick={demo}>
            Try demo
          </button>
          <button className="button button-outline" onClick={onStartUpload}>
            Get started <ArrowUpRight size={15} />
          </button>
          <button
            className="icon-button mobile-menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="mobile-menu"
          aria-label="Mobile navigation"
        >
          {[
            ["Features", "features"],
            ["How it works", "workflow"],
            ["Your privacy", "privacy"],
            ["FAQs", "faq"],
          ].map(([label, id]) => (
            <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
              {label}
              <ArrowUpRight size={16} />
            </a>
          ))}
        </nav>
      )}
      <main>
        <section className="hero page-width">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="status-dot" /> Financial clarity, on your terms
            </span>
            <h1>
              Your numbers.
              <br />A clearer picture.
              <br />
              <span>Smarter decisions.</span>
            </h1>
            <p>
              Turn complex bank statements into a clear financial story.
              Understand your cash flow, spot unusual activity, and see what
              comes next.
            </p>
            <div className="hero-actions">
              <button className="button button-lime" onClick={onStartUpload}>
                Analyse a statement <ArrowUpRight size={18} />
              </button>
              <button className="play-button" onClick={demo}>
                <span>
                  <Play size={15} fill="currentColor" />
                </span>
                Explore the demo
              </button>
            </div>
            <div className="hero-topics">
              <span>Cash flow</span>
              <span>Spending insights</span>
              <span>Balance checks</span>
              <span>Forecasts</span>
              <span>Local processing</span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Illustrative financial analytics preview"
          >
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="preview-statement">
              <div className="mini-label">
                <FileText size={17} /> STATEMENT INSIGHTS
              </div>
              <div className="statement-title">
                A little more clarity.
                <br />A lot more control.
              </div>
              <div className="statement-line" />
              <div className="statement-row">
                <span>Income</span>
                <strong>+$8,450.00</strong>
              </div>
              <div className="statement-row">
                <span>Expenses</span>
                <strong>−$3,205.68</strong>
              </div>
              <div className="statement-line" />
              <div className="mini-label">ILLUSTRATIVE DATA</div>
            </div>
            <div className="preview-balance">
              <div className="balance-top">
                <Brand />
                <ArrowUpRight size={23} />
              </div>
              <p>Available balance</p>
              <strong>
                $24,586<span>.32</span>
              </strong>
              <div className="balance-footer">
                <span>
                  <span className="status-dot" /> A clearer view of your money
                </span>
                <BarChart3 size={24} />
              </div>
            </div>
            <div className="preview-chart">
              <span>Cash flow</span>
              <strong>
                Looking ahead <TrendingUp size={15} />
              </strong>
              <div className="mini-bars">
                {[32, 47, 39, 65, 48, 74, 57, 89, 72, 100, 86, 110].map(
                  (h, i) => (
                    <i key={i} style={{ height: h }} />
                  ),
                )}
              </div>
            </div>
            <div className="floating-check">
              <ShieldCheck size={20} />
              <span>Processed locally</span>
            </div>
          </div>
        </section>
        <div className="format-strip page-width">
          <span>
            From raw files.
            <br />
            <strong>To real understanding.</strong>
          </span>
          <div>
            <FileText /> PDF statements
          </div>
          <div>
            <BarChart3 /> Excel workbooks
          </div>
          <div>
            <FileCheck2 /> CSV ledgers
          </div>
          <span className="format-note">
            One workspace. A complete picture.
          </span>
        </div>
        <section id="features" className="features-section page-width">
          <div className="section-top">
            <span className="section-pill">Built for clarity</span>
            <span>Less complexity. More perspective.</span>
          </div>
          <h2>
            Make sense of your money.
            <br />
            <span className="green-text">See the patterns.</span> Find your next
            move.
          </h2>
          <p className="section-description">
            A thoughtful set of tools for analysts, business owners, and anyone
            who wants to understand their financial story.
          </p>
          <div className="feature-grid">
            <article className="feature-card feature-intro">
              <span className="feature-number">01 / UNDERSTAND</span>
              <div className="feature-graphic graphic-donut">
                <div />
                <span>
                  <TrendingUp size={30} />
                </span>
              </div>
              <h3>
                Your finances,
                <br />
                at a glance.
              </h3>
              <p>
                Income, spending, and balances. One clear view of the numbers
                that matter.
              </p>
            </article>
            <article className="feature-card feature-green">
              <span className="feature-number">02 / DISCOVER</span>
              <BarChart3 className="feature-large-icon" />
              <h3>
                Follow the
                <br />
                money.
              </h3>
              <p>
                Explore spending categories, income sources, and daily cash
                flow.
              </p>
              <ArrowUpRight className="card-arrow" />
            </article>
            <article className="feature-card feature-lime">
              <span className="feature-number">03 / INVESTIGATE</span>
              <ShieldCheck className="feature-large-icon" />
              <h3>
                Spot what
                <br />
                stands out.
              </h3>
              <p>
                Review balance mismatches, duplicate candidates, and unusual
                transactions.
              </p>
              <ArrowUpRight className="card-arrow" />
            </article>
            <article className="feature-card feature-pale">
              <span className="feature-number">04 / LOOK AHEAD</span>
              <TrendingUp className="feature-large-icon" />
              <h3>
                Plan with
                <br />
                perspective.
              </h3>
              <p>
                Explore balance projections informed by your historical cash
                flow.
              </p>
              <ArrowUpRight className="card-arrow" />
            </article>
          </div>
        </section>
        <section id="workflow" className="workflow-section">
          <div className="page-width workflow-grid">
            <div className="workflow-visual">
              <span className="mini-label">
                <span className="status-dot" /> YOUR FINANCIAL WORKSPACE
              </span>
              <p>A clear view starts here.</p>
              <strong>
                From statement
                <br />
                to understanding.
              </strong>
              <div className="workflow-file">
                <FileText size={28} />
                <div>
                  <b>your-statement.csv</b>
                  <span>Ready for a fresh perspective</span>
                </div>
                <span className="check-circle">
                  <Check size={18} />
                </span>
              </div>
              <div className="workflow-stats">
                <span>
                  Private by design
                  <LockKeyhole size={18} />
                </span>
                <span>
                  Built for exploration
                  <ArrowUpRight size={18} />
                </span>
              </div>
            </div>
            <div>
              <span className="section-pill pill-outline">How it works</span>
              <h2>
                Financial clarity.
                <br />
                Three simple steps.
              </h2>
              <div className="steps">
                {[
                  [
                    "01",
                    "Bring your statement",
                    "Upload a PDF, CSV, or Excel file. Your data stays in your browser.",
                  ],
                  [
                    "02",
                    "See the whole picture",
                    "Explore cash flow, spending, income, and data quality in one place.",
                  ],
                  [
                    "03",
                    "Go a little deeper",
                    "Review flags, refine categories, and export your enriched transaction ledger.",
                  ],
                ].map(([n, title, desc]) => (
                  <div key={n}>
                    <span>{n}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="button button-dark" onClick={onStartUpload}>
                Let’s get started <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        </section>
        <section id="privacy" className="privacy-section page-width">
          <div>
            <span className="section-pill">Your data. Your space.</span>
            <h2>
              Big insights.
              <br />
              <span className="green-text">Small digital footprint.</span>
            </h2>
            <p>
              Your statement belongs to you. Explore it with local processing
              and no account required.
            </p>
            <button className="text-button" onClick={demo}>
              Take a look around <ArrowRight size={18} />
            </button>
          </div>
          <div className="privacy-cards">
            {[
              [
                LockKeyhole,
                "Stays in your browser",
                "Statement contents are processed locally, without uploading them to a server.",
              ],
              [
                ShieldCheck,
                "No account to create",
                "Start with a file or explore the sample dataset. Your loaded data clears on refresh.",
              ],
              [
                Sparkles,
                "Useful, explainable insights",
                "Inspect the ledger behind your charts. Treat forecasts and flags as prompts for review.",
              ],
            ].map(([Icon, title, desc], i) => {
              const I = Icon as typeof LockKeyhole;
              return (
                <article key={i}>
                  <I size={22} />
                  <div>
                    <h3>{title as string}</h3>
                    <p>{desc as string}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <section id="faq" className="faq-section page-width">
          <div>
            <span className="section-pill">Good questions</span>
            <h2>
              A little more
              <br />
              understanding.
            </h2>
          </div>
          <div>
            {faqs.map(([q, a], i) => (
              <article className="faq-item" key={q}>
                <h3>
                  <button
                    aria-expanded={openFaq === i}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    {q}
                    <ChevronDown
                      size={18}
                      className={openFaq === i ? "rotated" : ""}
                    />
                  </button>
                </h3>
                <p id={`faq-${i}`} hidden={openFaq !== i}>
                  {a}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="closing-cta page-width">
          <div>
            <span className="eyebrow">YOUR NEXT STEP STARTS WITH CLARITY</span>
            <h2>
              Meet your money.
              <br />
              All over again.
            </h2>
          </div>
          <div>
            <button className="button button-lime" onClick={onStartUpload}>
              Analyse your statement <ArrowUpRight size={18} />
            </button>
            <p>No sign-up. No server upload. Just insights.</p>
          </div>
        </section>
      </main>
      <footer className="site-footer page-width">
        <a href="#" aria-label="Vanguard home">
          <Brand />
        </a>
        <span>Financial understanding, thoughtfully built.</span>
        <span>© {new Date().getFullYear()} Vanguard</span>
      </footer>
    </div>
  );
}
