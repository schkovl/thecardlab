export const mockPortfolio = [
  { id: "1", card: "2023 Prizm V. Wembanyama Silver", grade: "PSA 10", cost: 1200, value: 1850, gain: 650, gainPct: 54.1, date: "2023-11-15" },
  { id: "2", card: "2020 Prizm J. Herbert RC", grade: "PSA 9", cost: 300, value: 420, gain: 120, gainPct: 40.0, date: "2021-08-20" },
  { id: "3", card: "1999 Base Charizard", grade: "PSA 8", cost: 800, value: 1200, gain: 400, gainPct: 50.0, date: "2022-01-10" },
  { id: "4", card: "2021 Select T. Lawrence", grade: "Raw", cost: 150, value: 200, gain: 50, gainPct: 33.3, date: "2022-09-05" },
  { id: "5", card: "2018 Topps Update S. Ohtani", grade: "PSA 10", cost: 250, value: 1100, gain: 850, gainPct: 340.0, date: "2019-04-12" },
];

export const portfolioHistory = Array.from({ length: 30 }).map((_, i) => {
  const base = 250000;
  const growth = i * 1000;
  const noise = (Math.random() - 0.5) * 5000;
  return {
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    value: Math.round(base + growth + noise)
  };
});
