import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";


enum DeskType {
    HotDesk = "Hot Desk",
    DedicatedDesk = "Dedicated Desk",
    PrivateOffice = "Private Office",
    SharedDesk = "Shared Desk"
}

@modelOptions({
    schemaOptions: {
        timestamps: true
    }
})
@index({ city: 1, area: 1 }) // Location-based searches
@index({ isDeleted: 1, isActive: 1 }) // Filter active spaces
@index({ type: 1, city: 1 }) // Desk type + location queries
@index({ popular: 1, rating: -1 }) // Featured/popular spaces
@index({ "coordinates.lat": 1, "coordinates.lng": 1 }) // Geospatial queries
@index({ price: 1 }) // Price-based filtering
export class Coordinates {
    @prop()
    public lat?: number;

    @prop()
    public lng?: number;
}

export class CoworkingSpace {
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
    public mailingPlanPrice!: string;

    @prop({ required: false })
    public brPlanPrice!: string;

    @prop({ required: true, default: 4.0 })
    public rating!: number;

    @prop({ required: true, default: 0 })
    public reviews!: number;

    @prop({ required: true, enum: DeskType })
    public type!: DeskType;

    @prop({ required: true, type: () => [String] })
    public features!: string[];

    @prop({ required: true, default: "Available Now" })
    public availability!: string;

    @prop({ default: false })
    public popular!: boolean;

    @prop({ type: () => Coordinates, _id: false })
    public coordinates?: Coordinates;

    @prop({ type: () => String })
    public image?: string;

    @prop({ default: false })
    public isDeleted?: boolean;

    @prop({ default: true })
    public isActive?: boolean;

    @prop({ ref: () => User })
    public partner?: Ref<User>;

    @prop({ ref: () => User, default: [] })
    public managers?: Ref<User>[];
}

export const CoworkingSpaceModel = getModelForClass(CoworkingSpace);
// Schema Updated
