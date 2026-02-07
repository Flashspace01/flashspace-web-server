import { getModelForClass, prop, modelOptions, Ref } from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";

export enum PayoutStatus {
    PENDING = "pending",
    APPROVED = "approved",
    PROCESSING = "processing",
    PAID = "paid",
    REJECTED = "rejected",
    CANCELLED = "cancelled"
}

export enum PaymentMethod {
    BANK_TRANSFER = "bank_transfer",
    UPI = "upi"
}

class BankDetails {
    @prop()
    public accountNumber?: string;

    @prop()
    public ifscCode?: string;

    @prop()
    public bankName?: string;

    @prop()
    public accountHolderName?: string;
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class PayoutRequest {
    @prop({ ref: () => User, required: true })
    public user!: Ref<User>;

    @prop({ required: true })
    public amount!: number;

    @prop({ enum: PayoutStatus, default: PayoutStatus.PENDING })
    public status!: PayoutStatus;

    @prop({ enum: PaymentMethod, required: true })
    public paymentMethod!: PaymentMethod;

    @prop({ type: () => BankDetails, _id: false })
    public bankDetails?: BankDetails;

    @prop()
    public upiId?: string;

    @prop()
    public transactionReference?: string; // For admin to add bank ref number

    @prop()
    public rejectionReason?: string;

    @prop()
    public processedAt?: Date;

    @prop({ default: false })
    public isDeleted?: boolean;
}

export const PayoutRequestModel = getModelForClass(PayoutRequest);
