import { prop, modelOptions, getModelForClass, index, ReturnModelType } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Types } from "mongoose";
import { User } from "../../authModule/models/user.model"; // Adjust path if your User model is elsewhere

export enum QuotationStatus {
  DRAFT = "Draft",
  SENT = "Sent",
  VIEWED = "Viewed",
  ACCEPTED = "Accepted",
  REJECTED = "Rejected",
}

export enum spaceType {
  PRIVATE_OFFICE = "Private Office",
  DEDICATED_DESK = "Dedicated Desk",
  MEETING_ROOM = "Meeting Room",
}

class ClientDetails {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true, trim: true, lowercase: true })
  public email!: string;

  @prop({ required: true, trim: true })
  public phone!: string;

  @prop({ trim: true })
  public companyName?: string;
}

class SpaceRequirements {
  @prop({ required: true, enum: spaceType })
  public spaceType!: spaceType;

  @prop({ required: true })
  public city!: string;

  @prop({ required: true })
  public location!: string;

  @prop({ required: true })
  public numberOfSeats!: number;

  @prop({ required: true })
  public duration!: string;

  @prop({ required: true })
  public startDate!: Date;
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "affiliate_quotations",
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
})
@index({ affiliateId: 1 }) // For fetching an affiliate's history
@index({ status: 1 }) // For filtering by status
@index({ createdAt: -1 }) // For sorting by newest
export class Quotation extends TimeStamps {
  public _id!: Types.ObjectId;

  @prop({ required: true, unique: true, trim: true })
  public quotationId!: string; // e.g., QT-2026-089

  @prop({ ref: () => User, required: true })
  public affiliateId!: Types.ObjectId;

  @prop({ type: () => ClientDetails, _id: false })
  public clientDetails!: ClientDetails;

  @prop({ type: () => SpaceRequirements, _id: false })
  public spaceRequirements!: SpaceRequirements;

  @prop({ trim: true })
  public additionalNotes?: string;

  @prop({ default: 0 })
  public price!: number;

  @prop({ enum: QuotationStatus, default: QuotationStatus.SENT })
  public status!: QuotationStatus;

  // Static method to generate custom ID
  public static async generateId(this: ReturnModelType<typeof Quotation>): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `QT-${currentYear}-`;

    const lastQuotation = await this.findOne({
      quotationId: new RegExp(`^${prefix}\\d+$`),
    })
      .sort({ quotationId: -1 })
      .select("quotationId")
      .lean();

    let nextSequence = 1;
    if (lastQuotation?.quotationId) {
      const parts = String(lastQuotation.quotationId).split("-");
      const lastSequence = Number(parts[parts.length - 1]);
      if (Number.isFinite(lastSequence) && lastSequence > 0) {
        nextSequence = lastSequence + 1;
      }
    }

    let candidateId = `${prefix}${String(nextSequence).padStart(3, "0")}`;
    while (await this.exists({ quotationId: candidateId })) {
      nextSequence += 1;
      candidateId = `${prefix}${String(nextSequence).padStart(3, "0")}`;
    }

    return candidateId;
  }
}

export const QuotationModel = getModelForClass(Quotation);
