import { prop, getModelForClass, Ref, modelOptions } from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";

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

  @prop({ enum: ['Pending', 'Paid'], default: 'Pending' })
  public status!: string;

  @prop()
  public adminNote?: string;
}

export const PartnerInvoiceModel = getModelForClass(PartnerUploadedInvoice);
