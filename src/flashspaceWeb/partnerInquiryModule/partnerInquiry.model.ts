import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";

@modelOptions({
    schemaOptions: {
        timestamps: true
    }
})
@index({ email: 1 })
@index({ partnershipType: 1 })
@index({ createdAt: -1 })
export class PartnerInquiry {
    @prop({ required: true, trim: true })
    public name!: string;

    @prop({ required: true, trim: true })
    public email!: string;

    @prop({ required: true, trim: true })
    public phone!: string;

    @prop({ trim: true })
    public company?: string;

    @prop({ required: true })
    public partnershipType!: string;

    @prop()
    public message?: string;

    @prop({ default: 'pending' })
    public status?: string; // pending, contacted, approved, rejected

    @prop({ default: false })
    public isDeleted?: boolean;
}

export const PartnerInquiryModel = getModelForClass(PartnerInquiry);
