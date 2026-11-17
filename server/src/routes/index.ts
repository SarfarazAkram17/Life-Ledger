import { Router, type IRouter } from "express";
import healthRouter from "./health.routes";
import authRouter from "./auth.routes";
import transactionsRouter from "./transactions.routes";
import budgetsRouter from "./budgets.routes";
import prefsRouter from "./prefs.routes";
import dataRouter from "./data.routes";
import pinsRouter from "./pins.routes";
import categoriesRouter from "./categories.routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/transactions", transactionsRouter);
router.use("/budgets", budgetsRouter);
router.use("/prefs", prefsRouter);
router.use("/data", dataRouter);
router.use("/pin", pinsRouter);
router.use("/categories", categoriesRouter);

export default router;
