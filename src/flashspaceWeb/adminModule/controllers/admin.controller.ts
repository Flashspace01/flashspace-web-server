import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";

const adminService = new AdminService();

export class AdminController {

    // GET /api/admin/dashboard
    static async getDashboardStats(req: Request, res: Response) {
        const result = await adminService.getDashboardStats();
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    }

    // GET /api/admin/users
    static async getUsers(req: Request, res: Response) {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;

        const result = await adminService.getUsers(page, limit, search);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    }

    // GET /api/admin/kyc/pending
    static async getPendingKYC(req: Request, res: Response) {
        const result = await adminService.getPendingKYC();
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    }
}
