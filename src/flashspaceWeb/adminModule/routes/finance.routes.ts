import { Router } from "express";
import { FinanceController } from "../controllers/finance.controller";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { RBACMiddleware } from "../../authModule/middleware/rbac.middleware";
import { Permission } from "../../authModule/config/permissions.config";

console.log("💰 Finance Routes Registered");
export const financeRoutes = Router();

// All finance routes require authentication and specific permissions
financeRoutes.use(AuthMiddleware.authenticate);

// GET /api/admin/finance/summary
financeRoutes.get(
    "/summary",
    RBACMiddleware.requireAnyPermission([
        Permission.MANAGE_ALL_SPACES, // Adjust permissions as needed
        Permission.VIEW_ALL_SPACES,
    ]),
    FinanceController.getFinanceSummary
);

// GET /api/admin/finance/balance-sheet
financeRoutes.get(
    "/balance-sheet",
    RBACMiddleware.requireAnyPermission([
        Permission.MANAGE_ALL_SPACES,
        Permission.VIEW_ALL_SPACES,
    ]),
    FinanceController.getBalanceSheet
);
