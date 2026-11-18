import { Router, type IRouter } from "express";
import healthRouter from "./health.routes";
import authRouter from "./auth.routes";
import transactionsRouter from "./transactions.routes";
import budgetsRouter from "./budgets.routes";
import prefsRouter from "./prefs.routes";
import dataRouter from "./data.routes";
import pinsRouter from "./pins.routes";
import categoriesRouter from "./categories.routes";
import { requireAuth } from "../middleware/auth.middleware";
import { requirePinUnlock } from "../middleware/pin.middleware";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
// Financial data needs a login session AND, for accounts with a PIN, a verified PIN.
const protectedData = [requireAuth, requirePinUnlock];
router.use("/transactions", protectedData, transactionsRouter);
router.use("/budgets", protectedData, budgetsRouter);
router.use("/data", protectedData, dataRouter);
router.use("/categories", protectedData, categoriesRouter);
router.use("/prefs", prefsRouter);
router.use("/pin", pinsRouter);

export default router;
