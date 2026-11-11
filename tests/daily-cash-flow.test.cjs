const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { BarChart, Bar, XAxis, YAxis } = require("recharts");

const compiled = ts.transpileModule(
  fs.readFileSync("src/lib/charts/daily-cash-flow.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { getDailyCashFlowLayout } = context.exports;

// Same six-month density as the uploaded statement: 120 transaction days.
const data = Array.from({ length: 120 }, (_, i) => ({
  date: `2026-${String(Math.floor(i / 20) + 1).padStart(2, "0")}-${String((i % 20) + 1).padStart(2, "0")}`,
  income: i % 20 === 0 ? 600000 : 0,
  expenses: i % 20 === 0 ? 0 : 20000,
}));
function rectangles(width, layout = {}) {
  const { minWidth, ...barLayout } = layout;
  const markup = renderToStaticMarkup(
    React.createElement(
      BarChart,
      {
        width,
        height: 256,
        data,
        margin: { top: 10, right: 10, left: 0, bottom: 0 },
        ...barLayout,
      },
      React.createElement(XAxis, { dataKey: "date" }),
      React.createElement(YAxis),
      React.createElement(Bar, {
        dataKey: "income",
        fill: "#145c37",
        radius: [4, 4, 0, 0],
        isAnimationActive: false,
      }),
      React.createElement(Bar, {
        dataKey: "expenses",
        fill: "#a4cd59",
        radius: [4, 4, 0, 0],
        isAnimationActive: false,
      }),
    ),
  );
  return (
    markup.match(/<path[^>]*class="recharts-rectangle"[^>]*>/g) || []
  ).map((path) => ({
    width: Number(path.match(/width="([^"]+)"/)[1]),
    height: Number(path.match(/height="([^"]+)"/)[1]),
    fill: path.match(/fill="([^"]+)"/)?.[1],
  }));
}

test("dense daily data reproduces subpixel bars at the previous chart width", () => {
  const bars = rectangles(700);
  assert.equal(bars.length, 120);
  assert.ok(bars.every((bar) => bar.width > 0 && bar.width < 1));
});
test("daily chart renders every nonzero day as a readable bar at phone and desktop widths", () => {
  const layout = getDailyCashFlowLayout(data.length);
  for (const viewportWidth of [320, 700, 1440]) {
    const bars = rectangles(Math.max(viewportWidth, layout.minWidth), layout);
    assert.equal(bars.length, 120);
    assert.ok(bars.every((bar) => bar.width >= 6 && bar.height > 0));
    assert.equal(bars.filter((bar) => bar.fill === "#145c37").length, 6);
    assert.equal(bars.filter((bar) => bar.fill === "#a4cd59").length, 114);
  }
});
test("small and empty datasets retain a usable minimum chart width", () => {
  assert.equal(getDailyCashFlowLayout(0).minWidth, 360);
  assert.equal(getDailyCashFlowLayout(1).minWidth, 360);
  assert.ok(
    getDailyCashFlowLayout(120).minWidth > getDailyCashFlowLayout(20).minWidth,
  );
});
