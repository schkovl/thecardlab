import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SERVICES = [
  {
    id: "cleaning",
    name: "Ultrasonic Cleaning",
    description: "Removes surface wax, fingerprints, and minor blemishes without damaging the gloss.",
    price: 15,
    unit: "card",
    color: "primary",
    turnaround: "3–5 business days",
  },
  {
    id: "pressing",
    name: "Micro-Pressing",
    description: "Flattens minor indentations, edge waves, and restores overall structural integrity.",
    price: 25,
    unit: "card",
    color: "accent",
    turnaround: "5–7 business days",
  },
  {
    id: "reholdering",
    name: "Re-holdering",
    description: "Cracking out of old cases and prep for modern grading submissions.",
    price: 10,
    unit: "card",
    color: "secondary",
    turnaround: "2–3 business days",
  },
  {
    id: "bundle",
    name: "Full Restoration Bundle",
    description: "Cleaning + pressing + re-holdering. Best value for high-end submissions.",
    price: 40,
    unit: "card",
    color: "primary",
    turnaround: "7–10 business days",
  },
];

// GET /api/restoration — service catalog. No auth required.
router.get("/restoration", (_req, res) => {
  res.json(SERVICES);
});

export default router;
