import { prop, modelOptions, getModelForClass, index } from "@typegoose/typegoose";

export enum MeetingStatus {
    Scheduled = "scheduled",
    Completed = "completed",
    Cancelled = "cancelled"
}

@modelOptions({
    schemaOptions: {
        timestamps: true
    }
})
@index({ bookingUserEmail: 1 })
@index({ startTime: 1 })
@index({ status: 1 })
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL index
export class Meeting {
    @prop({ required: true, trim: true })
    public bookingUserName!: string;

    @prop({ required: true, trim: true })
    public bookingUserEmail!: string;

    @prop({ required: true })
    public bookingUserPhone!: string;

    @prop({ required: true })
    public startTime!: Date;

    @prop({ required: true })
    public endTime!: Date;

    @prop()
    public googleCalendarEventId?: string;

    @prop()
    public googleMeetLink?: string;

    @prop({ enum: MeetingStatus, default: MeetingStatus.Scheduled })
    public status!: MeetingStatus;

    @prop()
    public notes?: string;

    @prop({ required: true })
    public expiresAt!: Date; // TTL field - 30 mins after meeting ends
}

export const MeetingModel = getModelForClass(Meeting);
