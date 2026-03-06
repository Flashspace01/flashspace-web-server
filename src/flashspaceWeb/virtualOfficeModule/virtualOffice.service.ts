import { VirtualOfficeModel } from "./virtualOffice.model";
import { UserRole } from "../authModule/models/user.model";

export class VirtualOfficeService {
  static async createOffice(data: any, partnerId: string) {
    const office = new VirtualOfficeMoimport { Types } from "mongoose";
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

    // Strict property filtering if provided
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

      const matchedProperties =
        await PropertyModel.find(propertyQuery).select("_id");
      filter.property = { $in: matchedProperties.map((p) => p._id) };

      delete filter.city;
      delete filter.name;
      delete filter.area;
