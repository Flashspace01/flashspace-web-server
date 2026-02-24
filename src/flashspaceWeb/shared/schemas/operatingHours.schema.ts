import { prop } from "@typegoose/typegoose";

export class OperatingHours {
  @prop({ required: true, trim: true })
  public openTime!: string; // e.g., "09:00"

  @prop({ required: true, trim: true })
  public closeTime!: string; // e.g., "18:00"

  @prop({ type: () => [String], required: true })
  public daysOpen!: string[]; // e.g., ["Monday", "Tuesday", "Wednesday"]
}
