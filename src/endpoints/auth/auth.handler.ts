import {
  EndpointAuthType,
  EndpointRequestType,
  EndpointHandler,
  generateJwtToken,
  reportError
} from 'node-server-engine';
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { Permission, Role, User } from 'db';
import {
  AUTH_INVALID_CREDENTIALS,
  AUTH_LOGIN_ERROR,
  AUTH_USER_NOT_FOUND,
  AUTH_RESET_PASSWORD_SUCCESS,
  AUTH_RESET_PASSWORD_ERROR,
  AUTH_TOKEN_GENERATION_SUCCESS, 
  AUTH_TOKEN_GENERATION_ERROR
} from './auth.const';


export const loginHandler: EndpointHandler<EndpointAuthType> = async (
  req: EndpointRequestType[EndpointAuthType],
  res: Response
) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'password'],
      raw: true
    });

    if (!user) {
      res.status(401).json({ message: AUTH_USER_NOT_FOUND });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: AUTH_INVALID_CREDENTIALS });
      return;
    }

    const userDetails = (
      await User.findOne({
        where: { id: user.id },
        attributes: ['id', 'firstName', 'lastName', 'email'],
        include: [
          {
            model: Role,
            attributes: ['id', 'name'],
            include: [
              {
                model: Permission,
                through: { attributes: [] },
                attributes: ['action']
              }
            ]
          }
        ]
      })
    )?.toJSON();

    // Check if userDetails or userDetails.role is null
    if (!userDetails || !userDetails.role) {
       res
        .status(500)
        .json({
          message: AUTH_LOGIN_ERROR,
          error: 'User role or permissions not found'
        });
        return;
    }

    // Transform the user object
    const transformedUser = {
      id: userDetails.id,
      firstName: userDetails.firstName,
      lastName: userDetails.lastName,
      email: userDetails.email,
      roleId: userDetails.role.id,
      role: userDetails.role.name,
      permissions: userDetails.role.permissions.map(
        (perm: { action: string }) => perm.action
      )
    };

    const tokenExpiry = Math.floor(Date.now() / 1000) + (process.env.ACCESS_TOKEN_EXPIRATION_TIME ? parseInt(process.env.ACCESS_TOKEN_EXPIRATION_TIME, 10) : 30 * 60);
    const accessToken = generateJwtToken(transformedUser);

    res.status(200).json({ accessToken, tokenExpiry, user:transformedUser });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: AUTH_LOGIN_ERROR, error });
  }
};

export const resetPasswordHandler: EndpointHandler<EndpointAuthType> = async (
  req: EndpointRequestType[EndpointAuthType],
  res: Response
) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      res.status(404).json({ message: AUTH_USER_NOT_FOUND });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update({ password: hashedPassword }, { where: { email } });

    res.status(200).json({ message: AUTH_RESET_PASSWORD_SUCCESS });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: AUTH_RESET_PASSWORD_ERROR, error });
  }
};

export const generateTokenHandler: EndpointHandler<EndpointAuthType> = async (
  req: EndpointRequestType[EndpointAuthType],
  res: Response
) => {
  const {
    id = 1,
    email,
    firstName,
    lastName = '',
    role = 'Admin',
    roleId = 1,
    permissions = [
      'GetDepartment',
      'CreateDepartment',
      'UpdateDepartment',
      'DeleteDepartment'
    ]
  } = req.body;
  try {
    // 1. Build the payload that the backend engine expects
    const userPayload = {
      id,
      firstName,
      lastName,
      email,
      roleId,
      role,
      permissions
    };
    // 2. Generate the signed JWT token (using private key from keys/private-key.pem)
    const accessToken = generateJwtToken(userPayload);
    const tokenExpiry = Math.floor(Date.now() / 1000) + (process.env.ACCESS_TOKEN_EXPIRATION_TIME ? parseInt(process.env.ACCESS_TOKEN_EXPIRATION_TIME, 10) : 30 * 60); // 30 minutes
    // 3. Return the token and user payload
    res.status(200).json({
      message: AUTH_TOKEN_GENERATION_SUCCESS,
      accessToken,
      tokenExpiry,
      user: userPayload
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: AUTH_TOKEN_GENERATION_ERROR, error });
  }
};


