import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SHOWS = [
  { id: 1, name: "Burbank Sports Cards Show", date: "June 6-8, 2026", city: "Burbank, CA", venue: "Burbank Convention Center", featuredDealers: 350, url: "https://www.burbanksportscards.com" },
  { id: 2, name: "Chicago National (NSCC)", date: "July 22-26, 2026", city: "Chicago, IL", venue: "Donald E. Stephens Convention Center", featuredDealers: 900, url: "https://www.nsccshow.com" },
  { id: 3, name: "Dallas Card Show", date: "September 12-14, 2026", city: "Allen, TX", venue: "Marriott Dallas Allen Hotel", featuredDealers: 400, url: "https://dallascardshow.com" },
  { id: 4, name: "Beckett Grading Card Show NYC", date: "October 10-12, 2026", city: "New York, NY", venue: "Javits Convention Center", featuredDealers: 280, url: "https://www.beckett.com" },
  { id: 5, name: "Miami Card Show", date: "November 20-22, 2026", city: "Miami, FL", venue: "Miami Airport Convention Center", featuredDealers: 250, url: "https://miamicardshow.com" },
  { id: 6, name: "Las Vegas Card Show", date: "December 11-13, 2026", city: "Las Vegas, NV", venue: "Las Vegas Convention Center", featuredDealers: 300, url: "https://vegascardshow.com" },
];

// GET /api/shows — upcoming card shows. No auth required.
router.get("/shows", (_req, res) => {
  const now = new Date();
  const upcoming = SHOWS.filter(s => {
    const parts = s.date.split(",");
    const yearStr = parts[parts.length - 1]?.trim();
    const year = parseInt(yearStr ?? "", 10);
    if (!year) return true;
    if (year > now.getFullYear()) return true;
    if (year < now.getFullYear()) return false;
    // same year — try to parse month
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    for (let i = 0; i < monthNames.length; i++) {
      if (s.date.includes(monthNames[i])) {
        return i + 1 >= now.getMonth() + 1;
      }
    }
    return true;
  });
  res.json(upcoming);
});

export default router;
