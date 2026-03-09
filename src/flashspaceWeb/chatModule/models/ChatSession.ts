import mongoose, { Document, Schema, Model } from "mongoose";

export interface IChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  messages: IChatMessage[];
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false }); // Disable generated _id for subdocuments since we pass client ID

const chatSessionSchema = new Schema<IChatSession>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
    default: "Chat session"
  },
  messages: [chatMessageSchema],
  date: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
});

const ChatSession: Model<IChatSession> = mongoose.model<IChatSession>("ChatSession", chatSessionSchema);

export default ChatSession;
