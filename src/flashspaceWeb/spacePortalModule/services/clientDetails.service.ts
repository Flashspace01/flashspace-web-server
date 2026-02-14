import { Types } from "mongoose";
import { ApiResponse } from "../../authModule/types/auth.types";
import { SpacePortalClientModel } from "../models/client.model";
import { SpacePortalClientKycModel } from "../models/clientKyc.model";
import { SpacePortalClientAgreementModel } from "../models/clientAgreement.model";
import { SpacePortalClientBookingModel } from "../models/clientBookings.model";
import { SpacePortalClientInvoiceModel } from "../models/clientInvoice.model";

export class SpacePortalClientDetailsService {
  async getClientDetails(clientId: string): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(clientId)) {
        return {
          success: false,
          message: "Invalid client ID format",
        };
      }

      const client = await SpacePortalClientModel.findOne({
        _id: clientId,
        isDeleted: false,
      });

      if (!client) {
        return {
          success: false,
          message: "Client not found",
        };
      }

      const [kyc, agreement, bookings, invoices] = await Promise.all([
        SpacePortalClientKycModel.findOne({ client: clientId, isDeleted: false }),
        SpacePortalClientAgreementModel.findOne({
          client: clientId,
          isDeleted: false,
        }),
        SpacePortalClientBookingModel.find({
          client: clientId,
          isDeleted: false,
        }).sort({ date: -1 }),
        SpacePortalClientInvoiceModel.find({
          client: clientId,
          isDeleted: false,
        }).sort({ createdAt: -1 }),
      ]);

      const clientObj: any = client.toObject();
      clientObj.id = client._id?.toString?.() || clientObj.id;

      if (!clientObj.email) clientObj.email = "";
      if (!clientObj.phone) clientObj.phone = "";

      const mappedKycDocuments =
        kyc?.documents?.map((doc: any) => ({
          ...(doc.toObject ? doc.toObject() : doc),
          id: doc._id?.toString?.() || doc.id,
        })) || [];

      const mappedBookings =
        bookings?.map((booking: any) => ({
          ...(booking.toObject ? booking.toObject() : booking),
          id: booking._id?.toString?.() || booking.id,
          date: booking.date,
          slot: booking.slot,
          status: booking.status,
          amount: booking.amount,
        })) || [];

      const mappedInvoices =
        invoices?.map((invoice: any) => ({
          ...(invoice.toObject ? invoice.toObject() : invoice),
          id: invoice._id?.toString?.() || invoice.id,
        })) || [];

      return {
        success: true,
        message: "Client details fetched successfully",
        data: {
          ...clientObj,
          kyc: kyc
            ? {
                ...(kyc.toObject ? kyc.toObject() : kyc),
                documents: mappedKycDocuments,
              }
            : { status: "PENDING", documents: [] },
          agreement: agreement
            ? agreement.toObject?.() || agreement
            : {
                status: "PENDING",
                agreementUrl: "",
              },
          bookings: mappedBookings,
          invoices: mappedInvoices,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch client details",
        error: error?.message,
      };
    }
  }
}
