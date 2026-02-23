import { VirtualOfficeModel } from "./virtualOffice.model";
import { UserRole } from "../authModule/models/user.model";
import { PropertyService } from "../propertyModule/property.service";
import { PropertyModel } from "../propertyModule/property.model";
export class VirtualOfficeService {
  static async createOffice(data: any, partnerId: string) {
    const property = await PropertyService.createProperty(data, partnerId);

    const office = new VirtualOfficeModel({
      ...data,
      property: property._id,
      partner: partnerId,
    });
    return await office.save();
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

  static async getOffices(filter: any = {}) {
    if (filter.isDeleted === undefined) {
      filter.isDeleted = false;
    }

    // Handle queries on property fields (like city)
    if (filter.city || filter.name || filter.area) {
      const propertyQuery: any = {};
      if (filter.city) propertyQuery.city = filter.city;
      if (filter.name) propertyQuery.name = filter.name;
      if (filter.area) propertyQuery.area = filter.area;

      const matchedProperties =
        await PropertyModel.find(propertyQuery).select("_id");
      const propertyIds = matchedProperties.map((p) => p._id);

      delete filter.city;
      delete filter.name;
      delete filter.area;

      filter.property = { $in: propertyIds };
    }

    return await VirtualOfficeModel.find(filter)
      .populate("property")
      .sort({ createdAt: -1 });
  }

  static async getOfficeById(officeId: string) {
    return await VirtualOfficeModel.findOne({ _id: officeId, isDeleted: false })
      .populate("property")
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
