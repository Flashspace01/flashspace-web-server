import { Router, Request, Response } from "express";
import { SpacePortalSpaceModel } from "../models/space.model";
import { ServiceConfigModel, CoworkingSpaceConfigModel } from "../models/serviceConfig.model";
import { OccupancyService } from "../services/occupancy.service";
import { Types } from "mongoose";

const router = Router();

/**
 * PATCH /spaces/:id/services
 * Add or remove services from a space
 * Body: { serviceId: string, action: 'add' | 'remove' }
 */
router.patch("/:id/services", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { serviceId, action } = req.body;

        if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(serviceId)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        if (!['add', 'remove'].includes(action)) {
            return res.status(400).json({ error: "Action must be 'add' or 'remove'" });
        }

        const space = await SpacePortalSpaceModel.findById(id);
        if (!space) {
            return res.status(404).json({ error: "Space not found" });
        }

        if (action === 'add') {
            // Verify service exists
            const service = await ServiceConfigModel.findById(serviceId);
            if (!service) {
                return res.status(404).json({ error: "Service not found" });
            }

            // Check if already exists
            if (space.services.includes(serviceId as any)) {
                return res.status(400).json({ error: "Service already linked to this space" });
            }

            space.services.push(serviceId as any);
        } else {
            // Remove service
            const index = space.services.findIndex(s => s.toString() === serviceId);
            if (index === -1) {
                return res.status(404).json({ error: "Service not linked to this space" });
            }
            space.services.splice(index, 1);
        }

        await space.save();

        return res.status(200).json({
            message: `Service ${action === 'add' ? 'added to' : 'removed from'} space successfully`,
            space
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET /spaces/:id/occupancy
 * Get real-time occupancy data for all coworking services in a space
 */
router.get("/:id/occupancy", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid space ID format" });
        }

        const space = await SpacePortalSpaceModel.findById(id).populate('services');
        if (!space) {
            return res.status(404).json({ error: "Space not found" });
        }

        // Calculate occupancy for each coworking service
        const occupancyData = await Promise.all(
            space.services.map(async (service: any) => {
                if (service.type === 'CoworkingSpace') {
                    const percentage = await OccupancyService.getOccupancyPercentage(service._id.toString());
                    return {
                        serviceId: service._id,
                        serviceName: service.type,
                        totalSeats: service.totalSeats,
                        availableSeats: service.availableSeats,
                        occupiedSeats: service.totalSeats - service.availableSeats,
                        occupancyPercentage: percentage
                    };
                }
                return null;
            })
        );

        // Filter out null values (non-coworking services)
        const coworkingOccupancy = occupancyData.filter(d => d !== null);

        return res.status(200).json({
            spaceId: id,
            spaceName: space.name,
            occupancy: coworkingOccupancy
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;
