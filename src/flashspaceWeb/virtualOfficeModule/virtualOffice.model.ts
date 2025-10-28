import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";

@modelOptions({
    schemaOptions: {
        timestamps: true
    }
})

export class VirtualOffice {
    @prop({ required: true, trim: true })
    public name!: string;

    @prop({ required: true })
    public address!: string;

    @prop({ required: true, trim: true })
    public city!: string;

    @prop({ required: true, trim: true })
    public area!: string;

    @prop({ required: true })
    public price!: string;

    @prop({ required: true })
    public originalPrice!: string;

    @prop({ required: true })
    public gstPlanPrice!: string;

    @prop({ required: true })
    public mailingPlanPrice!: string;

    @prop({ required: true })
    public brPlanPrice!: string;

    @prop({ required: true, default: 4.0 })
    public rating!: number;

    @prop({ required: true, default: 0 })
    public reviews!: number;

    @prop({ required: true, type: () => [String] })
    public features!: string[];

    @prop({ required: true, default: "Available Now" })
    public availability!: string;

    @prop({ default: false })
    public popular!: boolean;

    @prop({ type: () => Object })
    public coordinates?: {
        lat: number;
        lng: number;
    };

    @prop({ type: () => String })
    public image?: string;

    @prop({ default: false })
    public isDeleted?: boolean;

    @prop({ default: true })
    public isActive?: boolean;
}

export const VirtualOfficeModel = getModelForClass(VirtualOffice);
