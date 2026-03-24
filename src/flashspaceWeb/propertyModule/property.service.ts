import { PropertyModel } from "./property.model";

export class PropertyService {
  static async createProperty(data: any, partnerId: string) {
    const propertyData = {
      name: data.name,
      address: data.address,
      city: data.city,
      area: data.area,
      features: data.features || data.amenities || [],
      location: data.location,
      images: data.images || [],
      partner: partnerId,
    };
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

    if (Object.keys(updateData).length === 0) return null;

    return await PropertyModel.findByIdAndUpdate(
      propertyId,
      { $set: updateData },
      { new: true, runValidators: true },
    );
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
      city: property.city,
      area: property.area,
      location: property.location,
      coordinates: derivedCoordinates,
      images: property.images,
      features: property.features,
      amenities: property.features, // Send as amenities for backwards compatibility if needed
      // Map both space-level and property-level ratings for the frontend
      rating: rest.avgRating || property.avgRating || 4.5, // Fallback to 4.5 if no rating yet
      reviews: rest.totalReviews || property.totalReviews || 0,
      avgRating: rest.avgRating || property.avgRating,
      totalReviews: rest.totalReviews || property.totalReviews,
    };
  }
  return docObj;
};
