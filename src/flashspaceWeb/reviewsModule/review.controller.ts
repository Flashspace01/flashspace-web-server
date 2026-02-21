import { Request, Response } from "express";
import { ReviewService } from "./review.service";
import { createReviewSchema } from "./review.validation";

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

    const { spaceId, spaceModel, rating, comment, reviewImages } =
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
