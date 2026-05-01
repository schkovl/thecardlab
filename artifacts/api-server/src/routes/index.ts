import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portfolioRouter from "./portfolio";
import scansRouter from "./scans";

const router: IRouter = Router();

router.use(healthRouter);
router.use(portfolioRouter);
router.use(scansRouter);

export default router;
