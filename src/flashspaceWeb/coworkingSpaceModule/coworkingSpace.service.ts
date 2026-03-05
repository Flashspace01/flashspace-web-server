import { CoworkingSpaceModel } from "./coworkingSpace.model";
import { FilterQuery, Types } from "mongoose";
import { UserRole } from "../authModule/models/user.model";
import { PropertyService } from "../propertyModule/property.service";
import { PropertyModel } from "../propertyModule/property.model";
import { SpaceApprovalStatus } from "../shared/enums/spaceApproval.enum";
import { checkAndAdvanceSpaceStatus } from "../shared/utils/spaceOnboarding.utils";

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
    let property;
    if (data.propertyId) {
      property = await PropertyModel.findById(data.propertyId);
      if (!property) throw new Error("Property not found");
    } else {
      property = await PropertyService.createProperty(data, partnerId);
    }

    if (data.floors) {
      data.floors = this.generateSeatsForFloors(data.floors);
    }

    const savedSpace = await CoworkingSpaceModel.create({
      ...data,
      property: property._id,
      partner: partnerId,
      approvalStatus: SpaceApprovalStatus.PENDING_KYC,
      avgRating: 0,
      totalReviews: 0,
    });

    // Check if we can automatically advance it
    await checkAndAdvanceSpaceStatus(partnerId, property._id.toString());

    return savedSpace;
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
    // Strict property filtering if provided
    if (query.property) {
      query.property =
        typeof query.property === "string"
          ? new Types.ObjectId(query.property)
          : query.property;

      // Remove other property-derived filters to ensure they don't conflict
      delete query.city;
      delete query.name;
      delete query.area;
    } else if (query.city || query.name || query.area) {
      const propertyQuery: any = {};
      if (query.city) propertyQuery.city = query.city;
      if (query.name) propertyQuery.name = query.name;
      if (query.area) propertyQuery.area = query.area;

      const matchedProperties =
        await PropertyModel.find(propertyQuery).select("_id");
      query.property = { $in: matchedProperties.map((p) => p._id) };

      delete query.city;
      delete query.name;
      delete query.area;

      if (propertyIds.length > 0) {
        query.$or = [
          { property: { $in: propertyIds } },
          legacyFieldQuery,
        ];
      } else {
        Object.assign(query, legacyFieldQuery);
      }
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
