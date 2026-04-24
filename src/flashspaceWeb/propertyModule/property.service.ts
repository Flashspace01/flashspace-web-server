import { PropertyModel } from "./property.model";

export class PropertyService {
  static async createProperty(data: any, partnerId: string) {
    const propertyData: any = {
      name: data.name,
      address: data.address,
      city: data.city,
      area: data.area,
      features: data.features || data.amenities || [],
      location: data.location,
      images: data.images || [],
      partner: partnerId,
      spaceId: data.spaceId,
      googleMapLink: data.googleMapLink,
    };

    if (data.googleMapLink && !data.location) {
      const coords = await this.extractCoordsFromLink(data.googleMapLink);
      if (coords) {
        propertyData.location = {
          type: "Point",
          coordinates: [coords.lng, coords.lat],
        };
      }
    }

    const property = new PropertyModel(propertyData);
    return await property.save();
  }

  static async updateProperty(propertyId: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.address) updateData.address = data.address;
    if (data.city) updateData.city = data.city;
    if (data.area) updateData.area = data.area;
    if (data.features || data.amenities)
      updateData.features = data.features || data.amenities;
    if (data.location) updateData.location = data.location;
    if (data.images) updateData.images = data.images;
    if (data.kycStatus) updateData.kycStatus = data.kycStatus;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.status) updateData.status = data.status;
    if (data.kycRejectionReason)
      updateData.kycRejectionReason = data.kycRejectionReason;
    if (data.spaceId) updateData.spaceId = data.spaceId;
    if (data.googleMapLink) {
      updateData.googleMapLink = data.googleMapLink;
      // Also update location if link is provided and no explicit location is sent
      if (!data.location) {
        const coords = await this.extractCoordsFromLink(data.googleMapLink);
        if (coords) {
          updateData.location = {
            type: "Point",
            coordinates: [coords.lng, coords.lat],
          };
        }
      }
    }

    if (Object.keys(updateData).length === 0) return null;

    return await PropertyModel.findByIdAndUpdate(
      propertyId,
      { $set: updateData },
      { new: true, runValidators: true },
    );
  }

  private static async extractCoordsFromLink(link: string) {
    let targetLink = link;

    // Resolve short links (maps.app.goo.gl or goo.gl/maps)
    if (link.includes("goo.gl")) {
      try {
        const https = require("https");
        targetLink = await new Promise((resolve) => {
          https
            .get(link, (res: any) => {
              if (res.headers.location) {
                resolve(res.headers.location);
              } else {
                resolve(link);
              }
            })
            .on("error", () => resolve(link));
        });
      } catch (err) {
        console.error("Failed to resolve short link:", err);
      }
    }

    // Improved regex to catch various formats
    // 1. Match @lat,lng
    // 2. Match q=lat,lng or ll=lat,lng or cbll=lat,lng
    // 3. Fallback to any lat,lng pair found in URL
    const atMatch = targetLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const qMatch = targetLink.match(/[q|ll|cbll]=(-?\d+\.\d+),(-?\d+\.\d+)/);
    const genericMatch = targetLink.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);

    const match = atMatch || qMatch || genericMatch;

    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }

    return null;
  }

  static async getProperties(query: any) {
    return await PropertyModel.find(query);
  }

  static async deleteProperty(propertyId: string) {
    // Could implement soft delete logic here if properties need to be retained independently
    // For now, space deletion handles space-level soft deletes. We might not want to delete
    // the property if it's shared across multiple space types at the same address.
    // So returning null or a no-op for now.
    return null;
  }
}

/**
 * Utility function to flatten a populated space document for the frontend.
 * It takes a document where `property` is populated and spreads its fields
 * onto the root level.
 */
export const flattenProperty = (spaceDoc: any) => {
  if (!spaceDoc) return null;
  const docObj =
    typeof spaceDoc.toObject === "function" ? spaceDoc.toObject() : spaceDoc;

  if (docObj.property && typeof docObj.property === "object") {
    const { property, ...rest } = docObj;
    console.log(`🔍 [BACKEND DEBUG] RAW PROPERTY JSON:`, JSON.stringify(property, null, 2));
    const derivedCoordinates =
      rest.coordinates ||
      (Array.isArray(property.location?.coordinates) &&
      property.location.coordinates.length === 2
        ? {
            lat: property.location.coordinates[1],
            lng: property.location.coordinates[0],
          }
        : undefined);

    return {
      ...rest,
      propertyId: property._id || property.id,
      name: property.name,
      address: property.address,
      spaceId: property.spaceId,
      city: property.city,
      area: property.area,
      location: property.location,
      coordinates: derivedCoordinates,
      images: property.images,
      features: property.features,
      amenities: property.features, // Send as amenities for backwards compatibility if needed
      googleMapLink: property.googleMapLink,
      property: property, // Optional: Keep reference to original property just in case
    };
  }
  return docObj;
};
