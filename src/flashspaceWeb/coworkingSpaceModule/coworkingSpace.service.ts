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

    // Ensure property details (including spaceId) are present in the response
    await savedSpace.populate({
      path: "property",
      select:
        "spaceId name address city area location images features isActive isDeleted status",
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

  static async getSpaces(
    query: FilterQuery<any>,
    options?: { limit?: number; page?: number },
  ) {
    // If the query targets a property field (like city), we need to resolve it via the PropertyModel first
    // Strict property filtering if provided
    const filter: any = { ...query };

    const limit = options?.limit ?? 0;
    const page = options?.page && options.page > 0 ? options.page : 1;

    if (filter.property) {
      filter.property =
        typeof filter.property === "string"
          ? new Types.ObjectId(filter.property)
          : filter.property;

      // Remove other property-derived filters to ensure they don't conflict
      delete filter.city;
      delete filter.name;
      delete filter.area;
    } else if (filter.city || filter.name || filter.area) {
      const propertyQuery: any = {};
      if (filter.city) propertyQuery.city = filter.city;
      if (filter.name) propertyQuery.name = filter.name;
      if (filter.area) propertyQuery.area = filter.area;

      const legacyFieldQuery: any = {};
      if (filter.city) legacyFieldQuery.city = filter.city;
      if (filter.name) legacyFieldQuery.name = filter.name;
      if (filter.area) legacyFieldQuery.area = filter.area;

      const matchedProperties =
        await PropertyModel.find(propertyQuery).select("_id");
      const propertyIds = matchedProperties.map((p) => p._id);

      delete filter.city;
      delete filter.name;
      delete filter.area;

      if (propertyIds.length > 0) {
        filter.$or = [{ property: { $in: propertyIds } }, legacyFieldQuery];
      } else {
        Object.assign(filter, legacyFieldQuery);
      }
    }

    const finalQuery = { ...filter, isDeleted: false };
    const baseQuery = CoworkingSpaceModel.find(finalQuery)
      .populate({
        path: "property",
        select:
          "spaceId name address city area location images features isActive isDeleted status",
      })
      .sort({ createdAt: -1 });

    if (limit && limit > 0) {
      const total = await CoworkingSpaceModel.countDocuments(finalQuery);
      const spaces = await baseQuery.limit(limit).skip((page - 1) * limit);
      return {
        spaces,
        total,
        limit,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }

    const spaces = await baseQuery;
    return {
      spaces,
      total: spaces.length,
      limit: spaces.length,
      page: 1,
      totalPages: 1,
    };
  }

  static async getSpaceById(spaceId: string) {
    if (!Types.ObjectId.isValid(spaceId)) {
      throw new Error("Invalid ID format");
    }
    return await CoworkingSpaceModel.findOne({
      _id: spaceId,
      isDeleted: false,
    }).populate({
      path: "property",
      select:
        "spaceId name address city area location images features isActive isDeleted status",
    });
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
