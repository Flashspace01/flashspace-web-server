import { CoworkingSpaceModel } from "./coworkingSpace.model";
import { FilterQuery, Types } from "mongoose";
import { UserRole } from "../authModule/models/user.model";
import { PropertyService } from "../propertyModule/property.service";
import { PropertyModel } from "../propertyModule/property.model";

export class CoworkingSpaceService {
  static generateSeatsForFloors(floors?: any[]) {
    if (!floors || !Array.isArray(floors)) return floors;
    return floors.map((floor) => {
      if (!floor.tables || !Array.isArray(floor.tables)) return floor;
      const updatedTables = floor.tables.map((table: any) => {
        if (table.numberOfSeats && (!table.seats || table.seats.length === 0)) {
          const generatedSeats = [];
          for (let i = 1; i <= table.numberOfSeats; i++) {
            generatedSeats.push({
              seatNumber: `${table.tableNumber}-${i}`,
              isActive: true,
            });
          }
          return { ...table, seats: generatedSeats };
        }
        return table; // keep existing seats if passed
      });
      return { ...floor, tables: updatedTables };
    });
  }

  static async createSpace(data: any, partnerId: string) {
    const property = await PropertyService.createProperty(data, partnerId);

    if (data.floors) {
      data.floors = this.generateSeatsForFloors(data.floors);
    }

    return await CoworkingSpaceModel.create({
      ...data,
      property: property._id,
      partner: partnerId,
      avgRating: 0,
      totalReviews: 0,
    });
  }

  // FIXED: Added userRole and dynamic RBAC query
  static async updateSpace(
    spaceId: string,
    data: any,
    userId: string,
    userRole?: string,
  ) {
    const query: any = { _id: spaceId, isDeleted: false };

    // Enforce ownership if the user is NOT an admin
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId;
    }

    // Exclude rating fields from update to prevent manipulation
    const { avgRating, totalReviews, ...updateData } = data;

    if (updateData.floors) {
      updateData.floors = this.generateSeatsForFloors(updateData.floors);
    }

    const spaceToUpdate = await CoworkingSpaceModel.findOne(query);
    if (!spaceToUpdate) {
      throw new Error("Space not found or unauthorized");
    }

    // Update Property Fields
    await PropertyService.updateProperty(
      spaceToUpdate.property.toString(),
      updateData,
    );

    const space = await CoworkingSpaceModel.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true },
    ).populate("property");

    return space;
  }

  static async getSpaces(query: FilterQuery<any>) {
    // If the query targets a property field (like city), we need to resolve it via the PropertyModel first
    if (query.city || query.name || query.area) {
      const propertyQuery: any = {};
      if (query.city) propertyQuery.city = query.city;
      if (query.name) propertyQuery.name = query.name;
      if (query.area) propertyQuery.area = query.area;

      const matchedProperties =
        await PropertyModel.find(propertyQuery).select("_id");
      const propertyIds = matchedProperties.map((p) => p._id);

      // Remove them from the main query to avoid errors on the CoworkingSpace schema
      delete query.city;
      delete query.name;
      delete query.area;

      query.property = { $in: propertyIds };
    }

    return await CoworkingSpaceModel.find({
      ...query,
      isDeleted: false,
    })
      .populate("property")
      .sort({ createdAt: -1 });
  }

  static async getSpaceById(spaceId: string) {
    if (!Types.ObjectId.isValid(spaceId)) {
      throw new Error("Invalid ID format");
    }
    return await CoworkingSpaceModel.findOne({
      _id: spaceId,
      isDeleted: false,
    }).populate("property");
  }

  // FIXED: Added userRole and dynamic RBAC query
  static async deleteSpace(spaceId: string, userId: string, userRole?: string) {
    const query: any = { _id: spaceId, isDeleted: false };

    // Enforce ownership if the user is NOT an admin
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId;
    }

    // Soft delete
    const space = await CoworkingSpaceModel.findOneAndUpdate(
      query,
      { isActive: false, isDeleted: true },
      { new: true },
    );

    if (!space) {
      throw new Error("Space not found or unauthorized");
    }

    return space;
  }
}
