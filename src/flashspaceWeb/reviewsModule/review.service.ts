import { ReviewModel } from "./review.model";

export class ReviewService {
  static async addReview(data: any, userId: string) {
    // ReviewModel has a compound unique index on { user: 1, space: 1 }
    // to prevent duplicate reviews at the database level.

    const review = await ReviewModel.create({
      ...data,
      user: userId,
    });

    return review;
  }

  static async getReviewsBySpace(spaceId: string, limit: number, page: number) {
    const reviews = await ReviewModel.find({ space: spaceId })
      .populate("user", "firstName lastName profilePicture") // Optional user payload
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await ReviewModel.countDocuments({ space: spaceId });

    return {
      reviews,
      total,
      limit,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
