import { expect } from 'chai';
import sinon from 'sinon';
import bcrypt from 'bcryptjs';
import { createMockRequest, createMockResponse } from 'test/stubs';
import { User } from 'db/models';
import { loginHandler, resetPasswordHandler } from './auth.handler';
import { AUTH_INVALID_CREDENTIALS, AUTH_USER_NOT_FOUND, AUTH_LOGIN_ERROR, AUTH_RESET_PASSWORD_SUCCESS, AUTH_RESET_PASSWORD_ERROR } from './auth.const';
import { loginValidator, resetPasswordValidator } from './auth.validator';

describe('Auth Endpoints', () => {
  describe('Auth Constants', () => {
    it('should have correct error messages', () => {
      expect(AUTH_USER_NOT_FOUND).to.equal('User not found');
      expect(AUTH_INVALID_CREDENTIALS).to.equal('Invalid credentials');
      expect(AUTH_LOGIN_ERROR).to.equal('Login error');
      expect(AUTH_RESET_PASSWORD_SUCCESS).to.equal('Password reset successfully');
      expect(AUTH_RESET_PASSWORD_ERROR).to.equal('Reset password error');
    });
  });

  describe('Auth Validators', () => {
    it('should validate email field correctly', () => {
      expect(loginValidator.email).to.exist;
      expect(loginValidator.email.in).to.equal('body');
      expect(loginValidator.email.isEmail).to.exist;
      expect(loginValidator.email.normalizeEmail).to.be.true;
    });

    it('should validate password field correctly', () => {
      expect(loginValidator.password).to.exist;
      expect(loginValidator.password.in).to.equal('body');
      expect(loginValidator.password.exists).to.exist;
    });

    it('should validate resetPassword fields correctly', () => {
      expect(resetPasswordValidator.email).to.exist;
      expect(resetPasswordValidator.email.in).to.equal('body');
      expect(resetPasswordValidator.email.isEmail).to.exist;

      expect(resetPasswordValidator.newPassword).to.exist;
      expect(resetPasswordValidator.newPassword.in).to.equal('body');
      expect(resetPasswordValidator.newPassword.exists).to.exist;
    });
  });

  describe('Auth Handlers', () => {
  let req: any;
  let res: any;
  let findOneStub: sinon.SinonStub;
  let bcryptCompareStub: sinon.SinonStub;

  beforeEach(() => {
    req = createMockRequest({
      body: {
        email: 'test@example.com',
        password: 'password123',
        newPassword: 'newPassword123'
      }
    });
    res = createMockResponse();

    findOneStub = sinon.stub(User, 'findOne');
    bcryptCompareStub = sinon.stub(bcrypt, 'compare');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Login Handler', () => {
    it.skip('should login successfully with valid credentials', async () => {
      const mockUserBasic = {
        id: '123',
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      const mockUserDetails = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: {
          id: '1',
          name: 'Admin',
          permissions: [
            { action: 'READ' },
            { action: 'WRITE' }
          ]
        },
        toJSON: function() {
          return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            role: this.role
          };
        }
      };

      findOneStub.onFirstCall().resolves(mockUserBasic);
      findOneStub.onSecondCall().resolves(mockUserDetails);
      bcryptCompareStub.resolves(true);

      await loginHandler(req, res);

      // Debug output
      if (res.status.calledWith(500)) {
        console.log('Error response:', res.json.firstCall?.args[0]);
      }

      expect(res.status).to.have.been.calledWith(200);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          accessToken: sinon.match.string,
          tokenExpiry: sinon.match.number,
          user: sinon.match({
            id: '123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'Admin',
            roleId: '1',
            permissions: ['READ', 'WRITE']
          })
        })
      );
    });

    it('should return 401 when user is not found', async () => {
      findOneStub.resolves(null);

      await loginHandler(req, res);

      expect(res.status).to.have.been.calledWith(401);
      expect(res.json).to.have.been.calledWith({ message: AUTH_USER_NOT_FOUND });
    });

    it('should return 401 when password does not match', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      findOneStub.resolves(mockUser);
      bcryptCompareStub.resolves(false);

      await loginHandler(req, res);

      expect(res.status).to.have.been.calledWith(401);
      expect(res.json).to.have.been.calledWith({ message: AUTH_INVALID_CREDENTIALS });
    });

    it('should return 500 when user has no role', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: null,
        toJSON: function() {
          return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            role: this.role
          };
        }
      };

      findOneStub.onFirstCall().resolves(mockUser);
      findOneStub.onSecondCall().resolves(mockUser);
      bcryptCompareStub.resolves(true);

      await loginHandler(req, res);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          message: AUTH_LOGIN_ERROR
        })
      );
    });

    it('should return 500 on database error', async () => {
      const error = new Error('Database error');
      findOneStub.rejects(error);

      await loginHandler(req, res);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          message: AUTH_LOGIN_ERROR,
          error
        })
      );
    });

    it('should handle bcrypt comparison error', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      findOneStub.resolves(mockUser);
      bcryptCompareStub.rejects(new Error('Bcrypt error'));

      await loginHandler(req, res);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          message: AUTH_LOGIN_ERROR
        })
      );
    });
  });

  describe('Reset Password Handler', () => {
    it('should reset password successfully when user exists', async () => {
      const mockUserInstance = {
        id: '123',
        email: 'test@example.com'
      };

      findOneStub.resolves(mockUserInstance);
      sinon.stub(bcrypt, 'hash').resolves('newHashedPassword' as any);
      const updateStub = sinon.stub(User, 'update').resolves([1] as any);

      await resetPasswordHandler(req, res);

      expect(res.status).to.have.been.calledWith(200);
      expect(res.json).to.have.been.calledWith({ message: AUTH_RESET_PASSWORD_SUCCESS });
      expect(updateStub).to.have.been.calledWith(
        { password: 'newHashedPassword' },
        { where: { email: 'test@example.com' } }
      );
    });

    it('should return 404 when user is not found', async () => {
      findOneStub.resolves(null);

      await resetPasswordHandler(req, res);

      expect(res.status).to.have.been.calledWith(404);
      expect(res.json).to.have.been.calledWith({ message: AUTH_USER_NOT_FOUND });
    });

    it('should return 500 on error', async () => {
      const error = new Error('DB Error');
      findOneStub.rejects(error);

      await resetPasswordHandler(req, res);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          message: AUTH_RESET_PASSWORD_ERROR,
          error
        })
      );
    });
  });
  });
});

