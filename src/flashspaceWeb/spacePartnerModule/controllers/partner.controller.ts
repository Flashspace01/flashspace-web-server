import { Request, Response } from 'express';
import { Partner } from '../models/partner.model';


export const createPartner = async (req: Request, res: Response) => {
    try {
        const { companyName, contactPerson, email, phone, bankAccount } = req.body;


        const files = (req as any).files;
        const logo = files?.['logo']?.[0] ? `/uploads/partners/${files['logo'][0].filename}` : undefined;
        const kyc = files?.['kyc']?.[0] ? `/uploads/partners/${files['kyc'][0].filename}` : undefined;


        let parsedBankAccount = bankAccount;
        if (typeof bankAccount === 'string') {
            try {
                parsedBankAccount = JSON.parse(bankAccount);
            } catch (error) {

                console.error("Bank account parse error", error);
            }
        }

        const newPartner = new Partner({
            companyName,
            contactPerson,
            email,
            phone,
            bankAccount: parsedBankAccount,
            logo,
            kyc
        });

        await newPartner.save();
        res.status(201).json({ message: 'Partner created successfully', partner: newPartner });
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating partner', error: error.message });
    }
};

export const updatePartner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const files = (req as any).files;
        if (files?.['logo']?.[0]) {
            updates.logo = `/uploads/partners/${files['logo'][0].filename}`;
        }
        if (files?.['kyc']?.[0]) {
            updates.kyc = `/uploads/partners/${files['kyc'][0].filename}`;
        }

        if (updates.bankAccount && typeof updates.bankAccount === 'string') {
            try {
                updates.bankAccount = JSON.parse(updates.bankAccount);
            } catch (error) {
                console.error("Bank account parse error", error);
            }
        }

        const updatedPartner = await Partner.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedPartner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        res.status(200).json({ message: 'Partner updated successfully', partner: updatedPartner });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating partner', error: error.message });
    }
};

// Get Partner by ID
export const getPartner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const partner = await Partner.findById(id);

        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        res.status(200).json(partner);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching partner', error: error.message });
    }
};

// Get All Partners
export const getAllPartners = async (req: Request, res: Response) => {
    try {
        const partners = await Partner.find();
        res.status(200).json(partners);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching partners', error: error.message });
    }
};

// Delete Partner
export const deletePartner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedPartner = await Partner.findByIdAndDelete(id);

        if (!deletedPartner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        res.status(200).json({ message: 'Partner deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error deleting partner', error: error.message });
    }
};
// Get Current Partner Profile
export const getCurrentPartner = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || !user.email) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        let partner = await Partner.findOne({ email: user.email });

        if (!partner) {
            // Mock data for demo/verification purposes as requested by user
            const mockPartner = {
                partnerId: "FSP-2024-001",
                companyName: "FlashSpace Premium Workspaces Pvt Ltd",
                contactPerson: user.fullName || "Admin",
                email: "partner@flashspace.com", // Keeping user request specific email for display, though it might differ from login
                phone: "+91 98765 43210",
                address: "123, Business Park, Bandra Kurla Complex, Mumbai - 400051",
                gst: "27AABCF1234D1Z5",
                pan: "AABCF1234D",
                bankAccount: {
                    accountName: "FlashSpace Premium Workspaces Pvt Ltd",
                    bankName: "HDFC Bank",
                    accountNumber: "**** **** **** 4567",
                    ifsc: "HDFC0001234",
                    branch: "BKC Branch, Mumbai",
                    accountType: "Current Account"
                }
            };
            return res.status(200).json(mockPartner);
        }

        res.status(200).json(partner);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching partner profile', error: error.message });
    }
};

// Update Current Partner Profile
export const updateCurrentPartner = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user || !user.email) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const updates = req.body;
        const files = (req as any).files;

        if (files?.['logo']?.[0]) {
            updates.logo = `/uploads/partners/${files['logo'][0].filename}`;
        }
        if (files?.['kyc']?.[0]) {
            updates.kyc = `/uploads/partners/${files['kyc'][0].filename}`;
        }

        if (updates.bankAccount && typeof updates.bankAccount === 'string') {
            try {
                updates.bankAccount = JSON.parse(updates.bankAccount);
            } catch (error) {
                console.error("Bank account parse error", error);
            }
        }

        // Ensure email matches logged-in user (prevent updating other's profiles via body injection)
        updates.email = user.email;

        // Upsert: Update if exists, create if not
        const updatedPartner = await Partner.findOneAndUpdate(
            { email: user.email },
            updates,
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ message: 'Profile updated successfully', partner: updatedPartner });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};
