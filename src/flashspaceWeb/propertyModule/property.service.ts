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

  static async getActiveCities() {
    return await PropertyModel.distinct("city", {
      isActive: true,
      isDeleted: { $ne: true },
    });
  }

  static async getSearchMetadata() {
    const properties = await PropertyModel.find(
      { isActive: true, isDeleted: { $ne: true } },
      { name: 1, city: 1, area: 1, location: 1 },
    );

    // Group properties by city and area to calculate average coordinates
    const cityData: Record<string, { latSum: number; lngSum: number; count: number }> = {};
    const areaData: Record<string, { latSum: number; lngSum: number; count: number; city: string }> = {};

    properties.forEach((p) => {
      if (
        Array.isArray(p.location?.coordinates) &&
        p.location.coordinates.length === 2
      ) {
        const [lng, lat] = p.location.coordinates;

        // Update City Averages
        if (!cityData[p.city]) {
          cityData[p.city] = { latSum: 0, lngSum: 0, count: 0 };
        }
        cityData[p.city].latSum += lat;
        cityData[p.city].lngSum += lng;
        cityData[p.city].count += 1;

        // Update Area Averages
        const areaKey = `${p.city}|${p.area}`;
        if (!areaData[areaKey]) {
          areaData[areaKey] = { latSum: 0, lngSum: 0, count: 0, city: p.city };
        }
        areaData[areaKey].latSum += lat;
        areaData[areaKey].lngSum += lng;
        areaData[areaKey].count += 1;
      }
    });

    const cities = Object.keys(cityData).sort().map(name => ({
      name,
      coordinates: {
        lat: cityData[name].latSum / cityData[name].count,
        lng: cityData[name].lngSum / cityData[name].count
      }
    }));

    const areas = Object.keys(areaData).sort().map(key => {
      const [city, name] = key.split('|');
      return {
        name,
        city,
        coordinates: {
          lat: areaData[key].latSum / areaData[key].count,
          lng: areaData[key].lngSum / areaData[key].count
        }
      };
    });

    const propertyNames = properties.map((p) => ({
      name: p.name,
      city: p.city,
      area: p.area,
      coordinates:
        Array.isArray(p.location?.coordinates) &&
          p.location.coordinates.length === 2
          ? {
            lat: p.location.coordinates[1],
            lng: p.location.coordinates[0],
          }
          : undefined,
    }));

    return { cities, areas, propertyNames };
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
      name: property.name,
      address: property.address,
      city: property.city,
      area: property.area,
      location: property.location,
      coordinates: derivedCoordinates,
      images: property.images,
      features: property.features,
      amenities: property.features, // Send as amenities for backwards compatibility if needed
    };
  }
  return docObj;
};
