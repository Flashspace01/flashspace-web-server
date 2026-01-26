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
        const deleted = String(req.query.deleted) === 'true';

        const result = await adminService.getUsers(page, limit, search, deleted);
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
    // DELETE /api/admin/users/:id
    static async deleteUser(req: Request, res: Response) {
        const { id } = req.params;
        const restore = String(req.query.restore) === 'true';

        const result = await adminService.deleteUser(id, restore);
        if (result.success) {
            res.status(200).json(result);
        } else {
            // Return 404 if user not found, otherwise 500
            const statusCode = result.message === "User not found" ? 404 : 500;
            res.status(statusCode).json(result);
        }
    }

    // GET /api/admin/bookings
    static async getAllBookings(req: Request, res: Response) {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        const result = await adminService.getAllBookings(page, limit);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    }

    // PUT /api/admin/kyc/:id/review
    static async reviewKYC(req: Request, res: Response) {
        const { id } = req.params;
        const { action, rejectionReason } = req.body;

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Invalid action. Must be 'approve' or 'reject'"
            });
        }

        const result = await adminService.reviewKYC(id, action, rejectionReason);
        if (result.success) {
            res.status(200).json(result);
        } else {
            const statusCode = result.message === "KYC document not found" ? 404 : 500;
            res.status(statusCode).json(result);
        }
    }
}
