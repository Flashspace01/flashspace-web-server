import { Request, Response } from "express";
import { ReviewService } from "./review.service";
import { createReviewSchema, getReviewsSchema } from "./review.validation";
import { ReviewModel } from "./review.model";
import { PropertyModel } from "../propertyModule/property.model";
import { CoworkingSpaceModel } from "../coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../virtualOfficeModule/virtualOffice.model";
import { MeetingRoomModel } from "../meetingRoomModule/meetingRoom.model";
import { TicketModel } from "../ticketModule/models/Ticket";
import { UserRole } from "../authModule/models/user.model";
import mongoose from "mongoose";

const sendError = (
  res: Response,
  status: number,
  message: string,
  error: any = null,
) => {
  return res.status(status).json({
    success: false,
    message,
    data: {},
    error:
      process.env.NODE_ENV === "development" ? error : "Internal Server Error",
  });
};

export const postReview = async (req: Request, res: Response) => {
  try {
    // 1. Validate Input
    console.log("Validating review input...");
    const validation = createReviewSchema.safeParse({ body: req.body });
    if (!validation.success) {
      console.log("Validation failed", validation.error);
      return sendError(
        res,
        400,
        "Validation Error",
        validation.error.issues.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      );
    }

    const { spaceId, spaceModel, rating, comment, reviewImages, npsScore } =
      validation.data.body;
    const userId = (req as any).user?.id;
    console.log(
      `Adding review for space ${spaceId} (${spaceModel}) by user ${userId}`,
    );

    // 2. Call Service
    const newReview = await ReviewService.addReview(
      {
        space: spaceId,
        spaceModel,
        rating,
        comment,
        reviewImages,
        npsScore,
      },
      userId,
    );
    console.log("Review added successfully", newReview._id);

    res.status(201).json({ success: true, data: newReview });
  } catch (err: any) {
    // Handle "Already Reviewed" error from MongoDB Unique Index
    if (err.code === 11000) {
      return sendError(res, 400, "You have already reviewed this space");
    }
    sendError(res, 500, "Review failed", err);
  }
};

export const getSpaceReviews = async (req: Request, res: Response) => {
  try {
    const validation = getReviewsSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { spaceId } = validation.data.params;
    const { limit, page } = validation.data.query;

    const _limit = limit ? Math.min(limit, 100) : 10;
    const _page = page ? Math.max(page, 1) : 1;

    const reviewData = await ReviewService.getReviewsBySpace(
      spaceId,
      _limit,
      _page,
    );

    res.status(200).json({
      success: true,
      message: "Reviews retrieved successfully",
      data: reviewData,
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to retrieve reviews", err);
  }
};

export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await ReviewModel.find()
      .populate("user", "fullName email profilePicture")
      .populate({
        path: "space",
        populate: { path: "property", select: "name area city" },
      })
      .sort({ createdAt: -1 });

    const transformedReviews = reviews.map((r: any) => ({
      _id: r._id,
      company: r.user?.fullName || "Anonymous",
      rating: r.rating,
      npsScore: r.npsScore,
      location: r.space?.property?.area || r.space?.property?.city || "Unknown",
      review: r.comment,
      createdAt: r.createdAt,
    }));

    res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: transformedReviews,
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to fetch reviews", err);
  }
};

export const getNpsStats = async (_req: Request, res: Response) => {
  try {
    const reviews = await ReviewModel.find({ npsScore: { $exists: true } });

    const total = reviews.length;
    const promoters = reviews.filter((r) => (r.npsScore || 0) >= 9).length;
    const detractors = reviews.filter((r) => (r.npsScore || 0) <= 6).length;
    const passives = total - promoters - detractors;

    const nps =
      total > 0
        ? Math.round((promoters / total) * 100 - (detractors / total) * 100)
        : 0;

    res.status(200).json({
      success: true,
      message: "NPS calculated successfully",
      data: {
        nps,
        totalResponses: total,
        promoters,
        passives,
        detractors,
      },
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to calculate NPS", err);
  }
};

export const getAiInsight = async (_req: Request, res: Response) => {
  try {
    const reviews = await ReviewModel.find().sort({ createdAt: -1 });

    if (reviews.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          insight: "Not enough review data yet to generate AI insights.",
        },
      });
    }

    const avgRating =
      reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

    let insight = "";
    if (avgRating >= 4.5) {
      insight =
        "Your space is performing exceptionally well! Customers love the experience. Consider highlighting these positive reviews in your marketing.";
    } else if (avgRating >= 3.5) {
      insight =
        "Good performance overall. Focus on addressing minor complaints in the comments to reach a 4.5+ rating.";
    } else {
      insight =
        "Performance needs improvement. Analyze low-rated reviews to identify recurring issues with facilities or service.";
    }

    res.status(200).json({
      success: true,
      data: { insight },
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to generate AI insight", err);
  }
};

/**
 * GET /api/v1/reviews/partner
 * Returns reviews for all spaces owned by the authenticated partner.
 */
export const getPartnerReviews = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user?.id;
    if (!partnerId) return sendError(res, 401, "Unauthorized");

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const ratingFilter = req.query.rating
      ? parseInt(req.query.rating as string)
      : null;
    const spaceTypeFilter = req.query.spaceType as string; // 'CoworkingSpace', 'VirtualOffice', 'MeetingRoom'

    // 1. Get this partner's property IDs
    const partnerProperties = await PropertyModel.find(
      { partner: partnerId },
      { _id: 1 },
    );
    const propertyIds = partnerProperties.map((p) => p._id);

    if (propertyIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No properties found for this partner",
        data: [],
      });
    }

    // 2. Get all space IDs across all types for those properties
    const [coworkingIds, virtualIds, meetingIds] = await Promise.all([
      CoworkingSpaceModel.distinct("_id", {
        property: { $in: propertyIds },
        isDeleted: false,
      }),
      VirtualOfficeModel.distinct("_id", {
        property: { $in: propertyIds },
        isDeleted: false,
      }),
      MeetingRoomModel.distinct("_id", { property: { $in: propertyIds } }),
    ]);

    const allSpaceIds = [
      ...coworkingIds.map((id) => new mongoose.Types.ObjectId((id as any).toString())),
      ...virtualIds.map((id) => new mongoose.Types.ObjectId((id as any).toString())),
      ...meetingIds.map((id) => new mongoose.Types.ObjectId((id as any).toString())),
    ];

    if (allSpaceIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No spaces found for this partner",
        data: {
          reviews: [],
          pagination: { total: 0, page, pages: 0, limit },
        },
      });
    }

    // 3. Prepare filters
    const query: any = { space: { $in: allSpaceIds } };
    if (ratingFilter) {
      query.rating = ratingFilter;
    }
    if (spaceTypeFilter) {
      query.spaceModel = spaceTypeFilter;
    }

    const skip = (page - 1) * limit;

    // 4. Get all reviews (not paginated yet to allow merging)
    const [reviews, ticketFeedback] = await Promise.all([
      ReviewModel.find(query)
        .populate("user", "fullName firstName lastName email profilePicture")
        .populate({
          path: "space",
          populate: { path: "property", select: "name area city" },
        })
        .lean(),
      TicketModel.find({ 
        partnerId: new mongoose.Types.ObjectId(partnerId), 
        rating: { $ne: null } 
      })
      .populate("user", "fullName firstName lastName email profilePicture")
      .populate({
        path: "bookingId",
        select: "bookingNumber spaceSnapshot type"
      })
      .lean()
    ]);

    // 5. Transform Reviews (Removed support tickets from list as requested)
    const transformedReviews = reviews.map((r: any) => ({
      _id: r._id,
      company: r.user?.fullName || `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim() || "Anonymous",
      rating: r.rating,
      npsScore: r.npsScore,
      location: r.space?.property?.area || r.space?.property?.city || r.space?.name || "Unknown",
      spaceName: r.space?.name || r.space?.property?.name || "",
      spaceId: r.space?._id || "",
      spaceType: r.spaceModel || "",
      review: r.comment,
      createdAt: r.createdAt,
      source: 'space_review'
    }));

    // Combine and apply filters (Only reviews now)
    let combined = [...transformedReviews];
    
    if (ratingFilter) {
      combined = combined.filter(item => item.rating === ratingFilter);
    }
    if (spaceTypeFilter) {
      combined = combined.filter(item => item.spaceType === spaceTypeFilter);
    }

    // Sort by date
    combined.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate manually
    const totalCount = combined.length;
    const paginated = combined.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      message: "Partner feedback fetched successfully",
      data: {
        reviews: paginated,
        pagination: {
          total: totalCount,
          page,
          pages: Math.ceil(totalCount / limit),
          limit,
        },
      },
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to fetch partner reviews", err);
  }
};

/**
 * GET /api/v1/reviews/partner/nps
 * Returns NPS stats scoped to the authenticated partner's spaces.
 */
export const getPartnerNpsStats = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user?.id;
    if (!partnerId) return sendError(res, 401, "Unauthorized");

    const partnerProperties = await PropertyModel.find(
      { partner: partnerId },
      { _id: 1 },
    );
    const propertyIds = partnerProperties.map((p) => p._id);

    const [coworkingIds, virtualIds, meetingIds] = await Promise.all([
      CoworkingSpaceModel.distinct("_id", {
        property: { $in: propertyIds },
        isDeleted: false,
      }),
      VirtualOfficeModel.distinct("_id", {
        property: { $in: propertyIds },
        isDeleted: false,
      }),
      MeetingRoomModel.distinct("_id", { property: { $in: propertyIds } }),
    ]);

    const allSpaceIds = [...coworkingIds, ...virtualIds, ...meetingIds];

    // NPS Calculation
    const [reviews, ticketFeedback] = await Promise.all([
      ReviewModel.find({
        space: { $in: allSpaceIds }
      }).lean(),
      TicketModel.find({
        partnerId: new mongoose.Types.ObjectId(partnerId),
        rating: { $ne: null }
      }).lean()
    ]);

    const totalResponses = reviews.filter(r => r.npsScore !== undefined).length + ticketFeedback.length;
    
    // Promoters (9-10 for reviews, 5 for tickets)
    const reviewPromoters = reviews.filter(r => (r.npsScore || 0) >= 9).length;
    const ticketPromoters = ticketFeedback.filter(t => (t.rating || 0) >= 5).length;
    const promoters = reviewPromoters + ticketPromoters;

    // Detractors (0-6 for reviews, 1-3 for tickets)
    const reviewDetractors = reviews.filter(r => r.npsScore !== undefined && (r.npsScore || 0) <= 6).length;
    const ticketDetractors = ticketFeedback.filter(t => (t.rating || 0) <= 3).length;
    const detractors = reviewDetractors + ticketDetractors;

    const passives = totalResponses - promoters - detractors;

    const nps = totalResponses > 0
      ? Math.round((promoters / totalResponses) * 100 - (detractors / totalResponses) * 100)
      : 0;

    // Average rating calculation (combine all reviews and tickets)
    const allRatings = [
      ...reviews.map(r => r.rating),
      ...ticketFeedback.map(t => t.rating || 0)
    ];

    const totalReviewsCount = allRatings.length;
    const avgRating = totalReviewsCount > 0
      ? Math.round((allRatings.reduce((acc, r) => acc + r, 0) / totalReviewsCount) * 10) / 10
      : 0;

    res.status(200).json({
      success: true,
      message: "Partner NPS stats calculated",
      data: {
        nps,
        totalResponses,
        promoters,
        passives,
        detractors,
        avgRating,
        totalReviews: totalReviewsCount,
      },
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to calculate partner NPS", err);
  }
};
