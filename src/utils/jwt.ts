import jwt, { SignOptions } from 'jsonwebtoken';
import config from '@config/config';

export const signToken = (payload: object) => {
  const options: SignOptions = {
    expiresIn: config.JWT_EXPIRES_IN
  };
  return jwt.sign(payload, config.JWT_SECRET as jwt.Secret, options);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, config.JWT_SECRET);
};
