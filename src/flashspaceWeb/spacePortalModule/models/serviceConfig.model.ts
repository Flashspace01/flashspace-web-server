import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";

export enum ServiceType {
    VIRTUAL_OFFICE = "VirtualOffice",
    COWORKING_SPACE = "CoworkingSpace"
}

export enum ServiceStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    MAINTENANCE = "MAINTENANCE"
}

@modelOptions({
    schemaOptions: {
        timestamps: true,
        discriminatorKey: "type"
    }
})
@index({ type: 1 })
@index({ price: 1 })
@index({ status: 1 })
export class ServiceConfig {
    @prop({ required: true, enum: ServiceType })
    public type!: ServiceType;

    @prop({ required: true, min: 0 })
    public price!: number;

    @prop({ required: true, enum: ServiceStatus, default: ServiceStatus.ACTIVE })
    public status!: ServiceStatus;

    @prop({ type: () => [String], default: [] })
    public amenities!: string[];
}

export class VirtualOfficeConfig extends ServiceConfig {
    @prop({ required: true, min: 0 })
    public monthlyPrice!: number;

    @prop({ required: true, min: 0 })
    public yearlyPrice!: number;

    @prop({ default: false })
    public businessAddress?: boolean;
}

export class CoworkingSpaceConfig extends ServiceConfig {
    @prop({ required: true, min: 0 })
    public totalSeats!: number;

    @prop({ required: true, min: 0 })
    public availableSeats!: number;

    @prop({ required: true, min: 0 })
    public seatsPerFloor!: number;

    @prop({ default: false })
    public hotDesking?: boolean;
}

export const ServiceConfigModel = getModelForClass(ServiceConfig);
export const VirtualOfficeConfigModel = getModelForClass(VirtualOfficeConfig);
export const CoworkingSpaceConfigModel = getModelForClass(CoworkingSpaceConfig);
