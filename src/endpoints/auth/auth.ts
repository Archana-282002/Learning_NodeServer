import {
  Endpoint,
  EndpointMethod,
  EndpointAuthType
} from 'node-server-engine';
import { loginValidator, resetPasswordValidator, generateTokenValidator } from './auth.validator';
import { loginHandler, resetPasswordHandler, generateTokenHandler } from './auth.handler';

export const loginEndpoint = new Endpoint({
  path: '/auth/login',
  method: EndpointMethod.POST,
  handler: loginHandler,
  authType: EndpointAuthType.NONE,
  validator: loginValidator
});

export const resetPasswordEndpoint = new Endpoint({
  path: '/auth/reset-password',
  method: EndpointMethod.POST,
  handler: resetPasswordHandler,
  authType: EndpointAuthType.NONE,
  validator: resetPasswordValidator
});

export const generateTokenEndpoint = new Endpoint({
  path: '/auth/token',
  method: EndpointMethod.POST,
  handler: generateTokenHandler,
  authType: EndpointAuthType.NONE,
  validator: generateTokenValidator
});

