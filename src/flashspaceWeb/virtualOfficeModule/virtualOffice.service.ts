import { VirtualOfficeModel } from "./virtualOffice.model";
import { UserRole } from "../authModule/models/user.model";

export class VirtualOfficeService {
  static async createOffice(data: any, partnerId: string) {
    const office = new VirtualOfficeModel({
      ...data,
      partner: partnerId,
    });
    return await office.save();
  }

  static async updateOffice(officeId: string, data: any, userId: string, userRole?: string) {
    const query: any = { _id: officeId, isDeleted: false };
    
    // SECURED: Only Admins can edit ANY office. Partners can only edit their own.
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId;
    }

    const office = await VirtualOfficeModel.findOneAndUpdate(
      query,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!office) throw new Error("Virtual office not found or unauthorized");
    return office;
  }

  static async getOffices(filter: any = {}) {
    if (filter.isDeleted === undefined) {
      filter.isDeleted = false;
    }
    return await VirtualOfficeModel.find(filter).sort({ createdAt: -1 });
  }

  static async getOfficeById(officeId: string) {
    return await VirtualOfficeModel.findOne({ _id: officeId, isDeleted: false }).populate(
      "partner",
      "firstName lastName email"
    );
  }

  static async deleteOffice(officeId: string, userId: string, userRole?: string, restore: boolean = false) {
    const query: any = { _id: officeId };
    
    // SECURED
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId;
    }

    const office = await VirtualOfficeModel.findOneAndUpdate(
      query,
      { 
        isDeleted: !restore,
        isActive: restore 
      },
      { new: true }
    );

    if (!office) throw new Error("Virtual office not found or unauthorized");
    return office;
  }
}