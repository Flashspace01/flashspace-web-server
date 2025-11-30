import { prop,getModelForClass,modelOptions,index } from "@typegoose/typegoose";

enum OfficeType {
  VirtualOffice = "Virtual Office",
  CoworkingSpace = "Coworking Space",
  PrivateOffice = "Private Office",
  MeetingRoom = "Meeting Room",
  EventSpace = "Event Space"
}


@modelOptions({
    schemaOptions:{
        timestamps:true
    }
})
@index({ email: 1 }) // Quick email lookups
@index({ city: 1, spaceType: 1 }) // Location + type searches
@index({ isDeleted: 1, isActive: 1 }) // Filter active providers
@index({ createdAt: -1 }) // Recent submissions
export class spaceProvider{
    @prop({required:true,trim:true})
    public spaceName!:string;

    @prop({required:true,enum:OfficeType})
    public spaceType!:OfficeType;

    @prop({required:true,trim:true})
    public city!:string;

    @prop()
    public capacity?:string;

    @prop({required:true})
    public fullAddress!:string;

    @prop({required:true})
    public pricePerMonth!:number;

    @prop()
    public amenities?:string;

    @prop()
    public description?:string;

    @prop({required:true,trim:true})
    public fullName!:string;

    @prop({required:true,trim:true})
    public email!:string;

    @prop({required:true,trim:true})
    public phone!:string;

    @prop({default:false})
    public isDeleted?:boolean;

    @prop({default:true})
    public isActive?:boolean;
}

export const SpaceProviderModel=getModelForClass(spaceProvider);
