import { prop, modelOptions,getModelForClass} from "@typegoose/typegoose";

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