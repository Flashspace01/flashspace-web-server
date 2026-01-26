import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";

@modelOptions({
    schemaOptions: {
        timestamps: true
    }
})
@index({ city: 1, area: 1 }) // Location-based searches
@index({ isDeleted: 1, isActive: 1 }) // Filter active offices
@index({ popular: 1, rating: -1 }) // Featured/popular offices
@index({ "coordinates.lat": 1, "coordinates.lng": 1 }) // Geospatial queries
@index({ price: 1 }) // Price-based filtering
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

    @prop({ required: false })
    public priceYearly?: string;

    @prop({ required: true })
    public originalPrice!: string;

    @prop({ required: false })
    public gstPlanPrice!: string;

    @prop({ required: false })
    public gstPlanPriceYearly?: string;

    @prop({ required: false })
    public mailingPlanPrice!: string;

    @prop({ required: false })
    public mailingPlanPriceYearly?: string;

    @prop({ required: false })
    public brPlanPrice!: string;

    @prop({ required: false })
    public brPlanPriceYearly?: string;

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
// Schema Updated
