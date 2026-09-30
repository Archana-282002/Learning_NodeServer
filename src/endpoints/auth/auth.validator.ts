import { Schema } from 'express-validator';

export const loginValidator: Schema = {
  email: {
    in: 'body',
    exists: {
      errorMessage: 'Email is required'
    },
    isEmail: {
      errorMessage: 'Email is not valid'
    },
    normalizeEmail: true
  },
  password: {
    in: 'body',
    exists: {
      errorMessage: 'Password is required'
    }
  }
};

export const resetPasswordValidator: Schema = {
  email: {
    in: 'body',
    exists: {
      errorMessage: 'Email is required'
    },
    isEmail: {
      errorMessage: 'Email is not valid'
    },
    normalizeEmail: true
  },
  newPassword: {
    in: 'body',
    exists: {
      errorMessage: 'New password is required'
    }
  }
};

export const generateTokenValidator: Schema = {
  email: {
    in: 'body',
    isEmail: { errorMessage: 'A valid email is required' },
    normalizeEmail: true
  },
  firstName: {
    in: 'body',
    exists: { errorMessage: 'First name is required' },
    isString: { errorMessage: 'First name must be a string' }
  },
  role: {
    in: 'body',
    optional: true,
    isString: { errorMessage: 'Role must be a string' }
  },
  permissions: {
    in: 'body',
    optional: true,
    isArray: { errorMessage: 'Permissions must be an array of strings' }
  }
};


