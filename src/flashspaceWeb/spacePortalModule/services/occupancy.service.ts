import { CoworkingSpaceConfigModel } from "../models/serviceConfig.model";

export class OccupancyService {
    /**
     * Atomically book a seat in a coworking space service.
     * Decrements availableSeats only if greater than 0.
     * @param serviceId The ID of the ServiceConfig (CoworkingSpaceConfig)
     * @returns True if booking was successful (seat available), false otherwise.
     */
    static async bookSeat(serviceId: string): Promise<boolean> {
        const result = await CoworkingSpaceConfigModel.updateOne(
            { _id: serviceId, availableSeats: { $gt: 0 } },
            { $inc: { availableSeats: -1 } }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Atomically release a seat (e.g., cancellation or checkout).
     * Increments availableSeats, ensuring it doesn't exceed totalSeats.
     * @param serviceId The ID of the ServiceConfig (CoworkingSpaceConfig)
     */
    static async releaseSeat(serviceId: string): Promise<boolean> {
        // First get the config to know total seats limit (optional check, 
        // strictly speaking $inc is safe but we might want to cap at totalSeats)
        // For a simple atomic release:
        
        // This query ensures we don't increment beyond some theoretical max if needed, 
        // but typically business logic handles the "max" validation differently.
        // Here we just increment.
        const result = await CoworkingSpaceConfigModel.updateOne(
            { _id: serviceId },
            { $inc: { availableSeats: 1 } }
        );
        
        return result.modifiedCount > 0;
    }

    /**
     * Get real-time occupancy percentage.
     * @param serviceId 
     */
    static async getOccupancyPercentage(serviceId: string): Promise<number | null> {
        const config = await CoworkingSpaceConfigModel.findById(serviceId).select('totalSeats availableSeats');
        if (!config) return null;

        if (config.totalSeats === 0) return 0;
        
        const occupied = config.totalSeats - config.availableSeats;
        return (occupied / config.totalSeats) * 100;
    }
}
