import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import budgetsRouter from "./budgets";
import prefsRouter from "./prefs";
import dataRouter from "./data";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/transactions", transactionsRouter);
router.use("/budgets", budgetsRouter);
router.use("/prefs", prefsRouter);
router.use("/data", dataRouter);

export default router;
