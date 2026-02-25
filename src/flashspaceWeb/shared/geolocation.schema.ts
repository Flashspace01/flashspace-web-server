import { prop } from "@typegoose/typegoose";

export class GeoLocation {
  @prop({ type: () => String, enum: ["Point"], default: "Point", required: true })
  public type!: string;

  @prop({
    type: () => [Number],
    required: true,
    validate: {
      validator: (v: number[]) => {
        // Must be exactly 2 elements: [longitude, latitude]
        if (!v || v.length !== 2) return false;
        const [lng, lat] = v;
        // Longitude must be between -180 and 180. Latitude between -90 and 90.
        return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
      },
      message: "Invalid coordinates. Must be [longitude, latitude] within valid ranges.",
    },
  })
  public coordinates!: number[];
}