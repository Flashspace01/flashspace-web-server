import { Request, Response } from "express";

import { FeedbackModel } from "./feedback.model";


/**

 * POST /api/feedback/create

 */

export const createFeedback = async (req: Request, res: Response) => {

  try {

    const { company, rating, npsScore, location, review } = req.body;



    if (!company || rating === undefined || !location || !review) {

      return res.status(400).json({

        success: false,

        message: "Required fields missing",

        data: {},

        error: "Validation error",

      });

    }



    const feedback = await FeedbackModel.create({

      company,

      rating: Number(rating),

      npsScore: npsScore !== undefined ? Number(npsScore) : undefined,

      location,

      review,

    });



    res.status(201).json({

      success: true,

      message: "Feedback submitted successfully",

      data: feedback,

      error: {},

    });

  } catch (err) {

    res.status(500).json({

      success: false,

      message: "Something went wrong",

      data: {},

      error: err,

    });

  }

};



/**

 * GET /api/feedback

 */

export const getAllFeedback = async (_req: Request, res: Response) => {

  try {

    const feedbacks = await FeedbackModel.find()

      .sort({ rating: -1, createdAt: -1 });



    res.status(200).json({

      success: true,

      message: "Feedback fetched successfully",

      data: feedbacks,

      error: {},

    });

  } catch (err) {

    res.status(500).json({

      success: false,

      message: "Something went wrong",

      data: {},

      error: err,

    });

  }

};



/**

 * GET /api/feedback/nps

 */

export const getNpsStats = async (_req: Request, res: Response) => {

  try {

    const feedbacks = await FeedbackModel.find({

      npsScore: { $exists: true },

    });



    const total = feedbacks.length;

    const promoters = feedbacks.filter(f => f.npsScore! >= 9).length;

    const detractors = feedbacks.filter(f => f.npsScore! <= 6).length;

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

      error: {},

    });

  } catch (err) {

    res.status(500).json({

      success: false,

      message: "Something went wrong",

      data: {},

      error: err,

    });

  }

};



/**

 * GET /api/feedback/ai-insight

 * AI-based business suggestion for space partners

 */

export const getAiInsight = async (_req: Request, res: Response) => {

  try {

    const feedbacks = await FeedbackModel.find().sort({ createdAt: -1 });



    if (feedbacks.length === 0) {

      return res.status(200).json({

        success: true,

        message: "No feedback available",

        data: {

          insight: "Not enough feedback data yet to generate AI insights.",

        },

        error: {},

      });

    }



    const ratings = feedbacks.map(f => f.rating);

    const avgRating =

      ratings.reduce((a, b) => a + b, 0) / ratings.length;



    const npsFeedbacks = feedbacks.filter(f => f.npsScore !== undefined);

    const total = npsFeedbacks.length;



    const promoters = npsFeedbacks.filter(f => f.npsScore! >= 9).length;

    const detractors = npsFeedbacks.filter(f => f.npsScore! <= 6).length;

    const passives = total - promoters - detractors;



    const nps =

      total > 0

        ? Math.round((promoters / total) * 100 - (detractors / total) * 100)

        : 0;



    const recentReviews = feedbacks

      .slice(0, 5)

      .map(f => f.review);




    res.status(200).json({

      success: true,

      message: "AI insight generated successfully",

      data: {

      },

      error: {},

    });

  } catch (err) {

    console.error("AI Insight Error:", err);

    res.status(500).json({

      success: false,

      message: "Failed to generate AI insight",

      data: {},

      error: err,

    });

  }

};