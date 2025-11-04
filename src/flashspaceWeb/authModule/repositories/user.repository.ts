import { User, UserModel } from '../models/user.model';
import { FilterQuery, UpdateQuery } from 'mongoose';

export class UserRepository {
  async create(userData: Partial<User>): Promise<User> {
    const user = new UserModel(userData);
    return await user.save();
  }

  async findByEmail(email: string, selectPassword: boolean = false): Promise<User | null> {
    const query = UserModel.findOne({ 
      email: email.toLowerCase(),
      isDeleted: false 
    });
    
    // Explicitly select password field if needed (for authentication)
    if (selectPassword) {
      query.select('+password');
    }
    
    return await query.exec();
  }
  
  // Specifically for authentication - always includes password
  async findByEmailForAuth(email: string): Promise<User | null> {
    return await UserModel.findOne({ 
      email: email.toLowerCase(),
      isDeleted: false 
    })
    .select('+password')
    .exec();
  }

  async findById(id: string): Promise<User | null> {
    return await UserModel.findOne({ 
      _id: id,
      isDeleted: false 
    }).exec();
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return await UserModel.findOne({ 
      googleId,
      isDeleted: false 
    }).exec();
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return await UserModel.findOne({ 
      emailVerificationToken: token,
      isDeleted: false,
      emailVerificationExpires: { $gt: new Date() }
    }).exec();
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return await UserModel.findOne({ 
      passwordResetToken: token,
      isDeleted: false,
      passwordResetExpires: { $gt: new Date() }
    }).exec();
  }

  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    return await UserModel.findOne({ 
      refreshTokens: refreshToken,
      isDeleted: false 
    }).exec();
  }

  async update(id: string, updateData: UpdateQuery<User>): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      updateData,
      { new: true }
    ).exec();
  }

  async updateByEmail(email: string, updateData: UpdateQuery<User>): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { email: email.toLowerCase(), isDeleted: false },
      updateData,
      { new: true }
    ).exec();
  }

  async verifyEmail(token: string): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { 
        emailVerificationToken: token,
        isDeleted: false,
        emailVerificationExpires: { $gt: new Date() }
      },
      {
        isEmailVerified: true,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined
      },
      { new: true }
    ).exec();
  }

  // OTP Methods
  async findByEmailWithOTP(email: string): Promise<User | null> {
    return await UserModel.findOne({ 
      email: email.toLowerCase(),
      isDeleted: false 
    })
    .select('+emailVerificationOTP')
    .exec();
  }

  async updateEmailVerificationOTP(
    email: string, 
    otp: string, 
    expiresAt: Date
  ): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { email: email.toLowerCase(), isDeleted: false },
      {
        emailVerificationOTP: otp,
        emailVerificationOTPExpiry: expiresAt,
        emailVerificationOTPAttempts: 0,
        lastOTPRequestTime: new Date(),
        $inc: { otpRequestCount: 1 }
      },
      { new: true }
    ).exec();
  }

  async incrementOTPAttempts(userId: string): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      { $inc: { emailVerificationOTPAttempts: 1 } },
      { new: true }
    ).exec();
  }

  async verifyEmailWithOTP(userId: string): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      {
        isEmailVerified: true,
        emailVerificationOTP: undefined,
        emailVerificationOTPExpiry: undefined,
        emailVerificationOTPAttempts: 0,
        emailVerificationToken: undefined,
        emailVerificationExpiry: undefined
      },
      { new: true }
    ).exec();
  }

  async clearOTPData(userId: string): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      {
        emailVerificationOTP: undefined,
        emailVerificationOTPExpiry: undefined,
        emailVerificationOTPAttempts: 0
      },
      { new: true }
    ).exec();
  }

  async resetOTPRequestCounter(email: string): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { email: email.toLowerCase(), isDeleted: false },
      {
        otpRequestCount: 0,
        lastOTPRequestTime: undefined
      },
      { new: true }
    ).exec();
  }

  async addRefreshToken(userId: string, refreshToken: string): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      { $push: { refreshTokens: refreshToken } },
      { new: true }
    ).exec();
  }

  async removeRefreshToken(userId: string, refreshToken: string): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      { $pull: { refreshTokens: refreshToken } },
      { new: true }
    ).exec();
  }

  async clearAllRefreshTokens(userId: string): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      { refreshTokens: [] },
      { new: true }
    ).exec();
  }

  async softDelete(id: string): Promise<User | null> {
    return await UserModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { 
        isDeleted: true,
        deletedAt: new Date(),
        refreshTokens: [] // Clear refresh tokens on delete
      },
      { new: true }
    ).exec();
  }

  async findMany(filter: FilterQuery<User> = {}, limit?: number, skip?: number): Promise<User[]> {
    const query = UserModel.find({ 
      ...filter, 
      isDeleted: false 
    });

    if (skip) query.skip(skip);
    if (limit) query.limit(limit);

    return await query.exec();
  }

  async count(filter: FilterQuery<User> = {}): Promise<number> {
    return await UserModel.countDocuments({ 
      ...filter, 
      isDeleted: false 
    }).exec();
  }
}