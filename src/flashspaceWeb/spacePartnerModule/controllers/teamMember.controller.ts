import { Request, Response } from "express";
import { UserModel, UserRole, AuthProvider } from "../../authModule/models/user.model";
import { PasswordUtil } from "../../authModule/utils/password.util";
import { EmailUtil } from "../../authModule/utils/email.util";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

type TeamMemberResponse = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: "active" | "inactive";
  loginPassword?: string | null;
  createdAt?: Date;
};

const getTeamPasswordKey = (): Buffer => {
  const secretSource =
    process.env.TEAM_MEMBER_PASSWORD_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.ACCESS_TOKEN_SECRET ||
    "flashspace-team-member-password-key";

  return createHash("sha256").update(secretSource).digest();
};

const encryptTeamPassword = (password: string) => {
  const key = getTeamPasswordKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: authTag.toString("hex"),
  };
};

const decryptTeamPassword = (
  encrypted?: string,
  iv?: string,
  tag?: string,
): string | null => {
  if (!encrypted || !iv || !tag) return null;

  try {
    const key = getTeamPasswordKey();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Failed to decrypt team member password:", error);
    return null;
  }
};

const mapTeamMember = (member: any): TeamMemberResponse => ({
  id: member._id.toString(),
  name: member.fullName,
  email: member.email,
  phoneNumber: member.phoneNumber || "",
  role: "Team Member",
  status: member.isActive ? "active" : "inactive",
  loginPassword: decryptTeamPassword(
    member.teamMemberPasswordEncrypted,
    member.teamMemberPasswordIv,
    member.teamMemberPasswordTag,
  ),
  createdAt: member.createdAt,
});

const hasPartnerAccess = (role?: string): boolean => {
  if (!role) return false;
  return (
    role === UserRole.PARTNER ||
    role === UserRole.ADMIN ||
    role === UserRole.SUPER_ADMIN
  );
};

const resolvePartnerOwnerId = async (
  authenticatedUserId: string,
): Promise<string | null> => {
  const user = await UserModel.findOne({
    _id: authenticatedUserId,
    isDeleted: false,
  }).select("_id parentPartnerId");

  if (!user) {
    return null;
  }

  return user.parentPartnerId
    ? user.parentPartnerId.toString()
    : user._id.toString();
};

const ensureLoginPasswordForMember = async (member: any) => {
  if (
    member.teamMemberPasswordEncrypted &&
    member.teamMemberPasswordIv &&
    member.teamMemberPasswordTag
  ) {
    return member;
  }

  const generatedPassword = PasswordUtil.generateRandomPassword(12);
  const hashedPassword = await PasswordUtil.hash(generatedPassword);
  const encryptedPassword = encryptTeamPassword(generatedPassword);

  await UserModel.updateOne(
    { _id: member._id },
    {
      $set: {
        password: hashedPassword,
        teamMemberPasswordEncrypted: encryptedPassword.encrypted,
        teamMemberPasswordIv: encryptedPassword.iv,
        teamMemberPasswordTag: encryptedPassword.tag,
      },
    },
  );

  const plainMember = typeof member.toObject === "function"
    ? member.toObject()
    : member;

  return {
    ...plainMember,
    teamMemberPasswordEncrypted: encryptedPassword.encrypted,
    teamMemberPasswordIv: encryptedPassword.iv,
    teamMemberPasswordTag: encryptedPassword.tag,
  };
};

export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const requesterId = req.user?.id;
    if (!requesterId || !hasPartnerAccess(req.user?.role)) {
      return res.status(401).json({
        success: false,
        message: "Partner authentication required",
      });
    }

    const ownerPartnerId = await resolvePartnerOwnerId(requesterId);
    if (!ownerPartnerId) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const members = await UserModel.find({
      parentPartnerId: ownerPartnerId,
      isTeamMember: true,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .select(
        "_id fullName email phoneNumber isActive createdAt teamMemberPasswordEncrypted teamMemberPasswordIv teamMemberPasswordTag",
      );

    const hydratedMembers = await Promise.all(
      members.map((member) => ensureLoginPasswordForMember(member)),
    );

    return res.status(200).json({
      success: true,
      data: hydratedMembers.map(mapTeamMember),
    });
  } catch (error) {
    console.error("Failed to fetch partner team members:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch team members",
    });
  }
};

export const createTeamMember = async (req: Request, res: Response) => {
  try {
    const requesterId = req.user?.id;
    if (!requesterId || !hasPartnerAccess(req.user?.role)) {
      return res.status(401).json({
        success: false,
        message: "Partner authentication required",
      });
    }

    const ownerPartnerId = await resolvePartnerOwnerId(requesterId);
    if (!ownerPartnerId) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { fullName, email, phoneNumber, password } = req.body as {
      fullName?: string;
      email?: string;
      phoneNumber?: string;
      password?: string;
    };

    const normalizedFullName = (fullName || "").trim();
    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedPhone = (phoneNumber || "").trim();

    if (!normalizedFullName || !normalizedEmail || !normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "fullName, email and phoneNumber are required",
      });
    }

    const manualPassword = typeof password === "string" ? password.trim() : "";
    if (manualPassword) {
      const passwordValidation = PasswordUtil.validatePassword(manualPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.errors.join(", "),
        });
      }
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const existingUser = await UserModel.findOne({
      email: normalizedEmail,
      isDeleted: false,
    }).select("_id");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const finalPassword =
      manualPassword || PasswordUtil.generateRandomPassword(12);
    const hashedPassword = await PasswordUtil.hash(finalPassword);
    const encryptedPassword = encryptTeamPassword(finalPassword);

    const createdMember = await UserModel.create({
      email: normalizedEmail,
      fullName: normalizedFullName,
      phoneNumber: normalizedPhone,
      password: hashedPassword,
      role: UserRole.PARTNER,
      authProvider: AuthProvider.LOCAL,
      isEmailVerified: true,
      isActive: true,
      isDeleted: false,
      refreshTokens: [],
      isTeamMember: true,
      teamMemberAccessRole: "team_member",
      parentPartnerId: ownerPartnerId,
      teamMemberPasswordEncrypted: encryptedPassword.encrypted,
      teamMemberPasswordIv: encryptedPassword.iv,
      teamMemberPasswordTag: encryptedPassword.tag,
    });

    const loginUrl =
      process.env.FRONTEND_URL?.trim() || "http://localhost:5173/login";

    const text = `Hi ${normalizedFullName},

Your FlashSpace team-member account has been created.

Login Email: ${normalizedEmail}
Password: ${finalPassword}
Login URL: ${loginUrl}

Please login and change your password immediately from your profile settings.
`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin-bottom: 8px;">Welcome to FlashSpace</h2>
        <p>Your team-member account has been created.</p>
        <p><strong>Login Email:</strong> ${normalizedEmail}</p>
        <p><strong>Password:</strong> ${finalPassword}</p>
        <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p>Please login and change your password immediately from your profile settings.</p>
      </div>
    `;

    // Non-blocking mail dispatch
    void EmailUtil.sendEmail({
      to: normalizedEmail,
      subject: "Your FlashSpace Team Member Login Credentials",
      html,
      text,
    });

    return res.status(201).json({
      success: true,
      message: "Team member created successfully",
      data: {
        member: mapTeamMember(createdMember),
        generatedPassword: finalPassword,
        isPasswordGenerated: !manualPassword,
      },
    });
  } catch (error) {
    console.error("Failed to create team member:", error);
    if ((error as any)?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create team member",
    });
  }
};

export const deleteTeamMember = async (req: Request, res: Response) => {
  try {
    const requesterId = req.user?.id;
    const { memberId } = req.params;

    if (!requesterId || !hasPartnerAccess(req.user?.role)) {
      return res.status(401).json({
        success: false,
        message: "Partner authentication required",
      });
    }

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId is required",
      });
    }

    const ownerPartnerId = await resolvePartnerOwnerId(requesterId);
    if (!ownerPartnerId) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const member = await UserModel.findOne({
      _id: memberId,
      parentPartnerId: ownerPartnerId,
      isTeamMember: true,
      isDeleted: false,
    }).select("_id");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    await UserModel.updateOne(
      { _id: memberId },
      {
        $set: {
          isDeleted: true,
          isActive: false,
          refreshTokens: [],
          teamMemberPasswordEncrypted: undefined,
          teamMemberPasswordIv: undefined,
          teamMemberPasswordTag: undefined,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Team member removed successfully",
    });
  } catch (error) {
    console.error("Failed to delete team member:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete team member",
    });
  }
};
