import { prop, modelOptions,getModelForClass,index} from "@typegoose/typegoose";

export enum VirtualOfficeSolutions {
  BusinessRegistration = "Business Registration",
  MailManagement = "Mail Management",
  MeetingRoomAccess = "Meeting Room Access",
  CoworkingSpace = "Coworking Space",
  FreeConsultation = "Free Consultation",
}

@modelOptions({
    schemaOptions:{
        timestamps:true
    }
})
@index({ email: 1 }) // Quick email lookups
@index({ isDeleted: 1, isActive: 1 }) // Filter active submissions
@index({ createdAt: -1 }) // Recent submissions sorting
@index({ serviceInterest: 1 }) // Filter by service type
export class contactForm{
    @prop({required:true,trim:true})
    public fullName!:string;

    @prop({required:true,trim:true})
    public email!:string;

    @prop({required:true})
    public phoneNumber!:string

    @prop({required:true})
    public companyName!:string;

    @prop({type:()=>[String],required:true,enum:VirtualOfficeSolutions})
    public serviceInterest!:VirtualOfficeSolutions[];

    @prop()
    public message?: string;

    @prop({default:true})
    public isActive?:boolean;

    @prop({default:false})
    public isDeleted?:boolean;
}

export const ContactFormModel=getModelForClass(contactForm);