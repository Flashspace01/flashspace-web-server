import { VirtualOfficeModel } from "./virtualOffice.model";
import { UserRole } from "../authModule/models/user.model";
import { PropertyModel } from "../propertyModule/property.model";
import { PropertyService } from "../propertyModule/property.service";
import { SpaceApprovalStatus } from "../shared/enums/spaceApproval.enum";
import { checkAndAdvanceSpaceStatus } from "../shared/utils/spaceOnboarding.utils";
export class VirtualOfficeService {
  static async createOffice(data: any, partnerId: string) {
    let property;
    if (data.propertyId) {
      property = await PropertyModel.findById(data.propertyId);
      if (!property) throw new Error("Property not found");
    } else {
      property = await PropertyService.createProperty(data, partnerId);
    }

    const office = new VirtualOfficeModel({
      ...data,
      property: property._id,
      partner: partnerId,
      approvalStatus: SpaceApprovalStatus.PENDING_KYC,
    });
    const savedOffice = await office.save();

    // Ensure property details (including spaceId) are present in the response
    await savedOffice.populate({
      path: "property",
      select:
        "spaceId name address city area location images features isActive isDeleted status",
    });

    // Check if we can automatically advance it
    await checkAndAdvanceSpaceStatus(partnerId, property._id.toString());

    return savedOffice;
  }

  static async updateOffice(
    officeId: string,
    data: any,
    userId: string,
    userRole?: string,
  ) {
    const query: any = { _id: officeId, isDeleted: false };

    // SECURED: Only Admins can edit ANY office. Partners can only edit their own.
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId;
    }

    // Check if office exists and user is authorized
    const officeToUpdate = await VirtualOfficeModel.findOne(query);
    if (!officeToUpdate) {
      throw new Error("Virtual office not found or unauthorized");
    }

    // Update Property Fields
    await PropertyService.updateProperty(
      officeToUpdate.property.toString(),
      data,
    );

    const office = await VirtualOfficeModel.findOneAndUpdate(
      query,
      { $set: data },
      { new: true, runValidators: true },
    ).populate("property");

    return office;
  }

  static async getOffices(
    filter: any = {},
    limit: number = 100,
    page: number = 1,
  ) {
    if (filter.isDeleted === undefined) {
      filter.isDeleted = false;
    }

    // Handle queries on property fields (like city, countryCode)
    const propertyFields = ['city', 'name', 'area', 'countryCode'];
    const hasPropertyFilters = propertyFields.some(field => filter[field] !== undefined);

    if (hasPropertyFilters) {
      const propertyQuery: any = {};
      const legacyFieldFilter: any = {};

      propertyFields.forEach(field => {
        if (filter[field] !== undefined) {
          propertyQuery[field] = filter[field];
          if (field !== 'countryCode') {
            legacyFieldFilter[field] = filter[field];
          }
          delete filter[field];
        }
      });

      const matchedProperties = await PropertyModel.find(propertyQuery).select("_id");
      const propertyIds = matchedProperties.map((p: any) => p._id);

      if (propertyIds.length > 0) {
        if (Object.keys(legacyFieldFilter).length > 0) {
          filter.$or = [
            { property: { $in: propertyIds } },
            legacyFieldFilter,
          ];
        } else {
          filter.property = { $in: propertyIds };
        }
      } else {
         Object.assign(filter, legacyFieldFilter);
      }
    }

    const offices = await VirtualOfficeModel.find(filter)
      .populate({
        path: "property",
        select:
          "spaceId name address city area location images features isActive isDeleted status",
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await VirtualOfficeModel.countDocuments(filter);

    return {
      offices,
      total,
      limit,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getOfficeById(officeId: string) {
    return await VirtualOfficeModel.findOne({ _id: officeId, isDeleted: false })
      .populate({
        path: "property",
        select:
          "spaceId name address city area location images features isActive isDeleted status",
      })
      .populate("partner", "firstName lastName email");
  }

  static async deleteOffice(
    officeId: string,
    userId: string,
    userRole?: string,
    restore: boolean = false,
  ) {
    const query: any = { _id: officeId };

    // SECURED
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId;
    }

    const office = await VirtualOfficeModel.findOneAndUpdate(
      query,
      {
        isDeleted: !restore,
        isActive: restore,
      },
      { new: true },
    );

    if (!office) throw new Error("Virtual office not found or unauthorized");
    return office;
  }
}
