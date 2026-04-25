import { prop, getModelForClass, Ref, modelOptions } from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";

class PartnerInvoicePaymentDetails {
  @prop({ enum: ["Bank Transfer", "UPI", "NEFT", "RTGS", "IMPS", "Other"] })
  public paymentMethod?: string;

  @prop()
  public amountPaid?: number;

  @prop()
  public paymentDate?: Date;

  @prop({ trim: true })
  public utrNumber?: string;

  @prop({ trim: true })
  public paymentProof?: string;

  @prop({ enum: ["AUTO", "MANUAL"] })
  public fetchMode?: string;

  @prop({ ref: () => User })
  public markedPaidBy?: Ref<User>;

  @prop()
  public markedPaidAt?: Date;
}

// Named "PartnerUploadedInvoice" to avoid collision with the existing
// "PartnerInvoice" model in spacePartnerModule/models/partnerFinancials.model.ts
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "partner_uploaded_invoices"
  },
  options: { allowMixed: 0 }
})
export class PartnerUploadedInvoice {
  @prop({ ref: () => User, required: true })
  public partnerId!: Ref<User>;

  @prop({ required: true })
  public invoiceNumber!: string;

  @prop({ required: true })
  public date!: Date;

  @prop({ required: true })
  public amount!: number;

  @prop({ required: true })
  public fileUrl!: string;

  @prop({ enum: ["Pending", "Paid", "PENDING", "PAID"], default: "Pending" })
  public status!: string;

  @prop()
  public adminNote?: string;

  @prop({ type: () => PartnerInvoicePaymentDetails })
  public paymentDetails?: PartnerInvoicePaymentDetails;
}

export const PartnerInvoiceModel = getModelForClass(PartnerUploadedInvoice);
