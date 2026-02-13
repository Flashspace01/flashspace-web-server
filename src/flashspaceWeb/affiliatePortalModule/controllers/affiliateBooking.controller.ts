import { Request, Response } from "express";
export const getBookings = async (req: Request, res: Response) => {
  try {
    const affiliateId = req.user?.id;
    if (!affiliateId) return res.status(401).json({ message: "Unauthorized" });

    const bookings = await AffiliateBookingModel.find({ affiliateId }).sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bookings" });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const affiliateId = req.user?.id;
    if (!affiliateId) return res.status(401).json({ message: "Unauthorized" });

    const newBooking = await AffiliateBookingModel.create({ ...req.body, affiliateId });
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ message: "Error creating booking", error });
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await AffiliateBookingModel.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Error fetching booking" });
  }
};
