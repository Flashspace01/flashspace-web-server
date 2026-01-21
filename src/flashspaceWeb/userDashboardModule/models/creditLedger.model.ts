import { prop, getModelForClass, modelOptions, Ref } from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";

export enum CreditSource {
    BOOKING = "booking",
    REDEEM = "redeem",
    BONUS = "bonus",
    REFUND = "refund",
}

@modelOptions({
    schemaOptions: {
        timestamps: true,
        collection: "credit_ledger"
    }
})
export class CreditLedger {
    @prop({ ref: () => User, required: true })
    public user!: Ref<User>;

    @prop({ required: true })
    public amount!: number; // Positive for earn, negative for redeem

    @prop({ required: true, enum: CreditSource })
    public source!: CreditSource;

    @prop()
    public description?: string;

    @prop()
    public referenceId?: string; // Booking ID or Payment ID

    @prop({ required: true })
    public balanceAfter!: number;
}

export const CreditLedgerModel = getModelForClass(CreditLedger);
