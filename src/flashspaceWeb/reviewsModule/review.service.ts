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
}
