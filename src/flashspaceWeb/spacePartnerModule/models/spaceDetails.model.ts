import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISpaceDetails extends Document {
	userKyc: Types.ObjectId; // Reference to SpaceUserKyc
	spaceName: string;
	sampleAgreement?: {
		name: string;
		mimetype: string;
		path: string;
		status?: string;
	};
	ownerOfPremisesName: string;
	propertyTaxReceipt?: {
		name: string;
		mimetype: string;
		path: string;
		status?: string;
	};
	aadhaarDocument?: {
		name: string;
		mimetype: string;
		path: string;
		status?: string;
	};
	panDocument?: {
		name: string;
		mimetype: string;
		path: string;
		status?: string;
	};
	overallStatus?: string;
	createdAt?: Date;
	updatedAt?: Date;
}


const SpaceDetailsSchema: Schema = new Schema(
	{
		userKyc: { type: Schema.Types.ObjectId, ref: 'SpaceUserKyc', required: true },
		spaceName: { type: String, required: true },
		sampleAgreement: {
			name: { type: String },
			mimetype: { type: String },
			path: { type: String },
			status: { type: String },
		},
		ownerOfPremisesName: { type: String, required: true },
		propertyTaxReceipt: {
			name: { type: String },
			mimetype: { type: String },
			path: { type: String },
			status: { type: String },
		},
		aadhaarDocument: {
			name: { type: String },
			mimetype: { type: String },
			path: { type: String },
			status: { type: String },
		},
		panDocument: {
			name: { type: String },
			mimetype: { type: String },
			path: { type: String },
			status: { type: String },
		},
		overallStatus: { type: String },
	},
	{ timestamps: true }
);

export default mongoose.model<ISpaceDetails>('SpaceDetails', SpaceDetailsSchema);
