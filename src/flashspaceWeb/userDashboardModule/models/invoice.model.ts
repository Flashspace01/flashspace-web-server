import { prop, getModelForClass, Ref, modelOptions, Severity } from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";

class LineItem {
  @prop({ required: true })
  description!: string;

  @prop({ default: 1 })
  quantity?: number;

  @prop({ required: true })
  rate!: number;

  @prop({ required: true })
  amount!: number;
}

class BillingAddress {
  @prop()
  name?: string;

  @prop()
  company?: string;

  @prop()
  gstNumber?: string;

  @prop()
  address?: string;

  @prop()
  city?: string;

  @prop()
  state?: string;

  @prop()
  pincode?: string;
}

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Invoice {
  @prop({ required: true, unique: true })
  invoiceNumber!: string;

  @prop({ ref: () => User, required: true })
  user!: Ref<User>;

  @prop()
  bookingId?: string;

  @prop()
  bookingNumber?: string;

  @prop()
  paymentId?: string;

  @prop({ required: true })
  description!: string;

  @prop({ type: () => [LineItem], default: [] })
  lineItems?: LineItem[];

  @prop({ required: true })
  subtotal!: number;

  @prop({ default: 18 })
  taxRate?: number;

  @prop({ default: 0 })
  taxAmount?: number;

  @prop({ required: true })
  total!: number;

  @prop({ enum: ["paid", "pending", "overdue", "cancelled"], default: "pending" })
  status?: string;

  @prop()
  dueDate?: Date;

  @prop()
  paidAt?: Date;

  @prop({ type: () => BillingAddress })
  billingAddress?: BillingAddress;

  @prop()
  pdfUrl?: string;

  @prop({ default: false })
  isDeleted?: boolean;

  @prop({ default: Date.now })
  createdAt?: Date;

  @prop({ default: Date.now })
  updatedAt?: Date;
}

export const InvoiceModel = getModelForClass(Invoice);
