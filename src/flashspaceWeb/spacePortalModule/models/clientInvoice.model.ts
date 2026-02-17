import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";
import { SpacePortalClient } from "./client.model";

export enum ClientInvoiceStatus {
  PAID = "PAID",
  PENDING = "PENDING",
  OVERDUE = "OVERDUE",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ client: 1 })
@index({ status: 1 })
@index({ createdAt: -1 })
@index({ isDeleted: 1 })
export class SpacePortalClientInvoice {
  @prop({ ref: () => SpacePortalClient, required: true })
  public client!: Ref<SpacePortalClient>;

  @prop({ required: true, trim: true })
  public invoiceNumber!: string;

  @prop({ required: true, min: 0 })
  public amount!: number;

  @prop({ required: true, enum: ClientInvoiceStatus })
  public status!: ClientInvoiceStatus;

  @prop()
  public pdfUrl?: string;

  @prop({ required: true })
  public createdAt!: Date;

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const SpacePortalClientInvoiceModel = getModelForClass(
  SpacePortalClientInvoice
);
