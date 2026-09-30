import { expect } from 'chai';
import sinon from 'sinon';
import { createMockRequest, createMockResponse } from 'test/stubs';
import { Department, Audit } from 'db/models';
import {
  createDepartmentHandler,
  getAllDepartmentsHandler,
  getDepartmentByIdHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler
} from './department.handler';
import {
  DEPARTMENT_NOT_FOUND,
  DEPARTMENT_CREATION_ERROR,
  DEPARTMENT_GET_ERROR,
  DEPARTMENT_UPDATE_ERROR,
  DEPARTMENT_DELETION_ERROR
} from './department.const';
import { createDepartmentValidator, updateDepartmentValidator } from './department.validator';

describe('Department Endpoints', () => {
  describe('Department Constants', () => {
    it('should have correct error messages', () => {
      expect(DEPARTMENT_NOT_FOUND).to.equal('Department not found');
      expect(DEPARTMENT_CREATION_ERROR).to.equal('Department creation error');
      expect(DEPARTMENT_GET_ERROR).to.equal('Department get error');
      expect(DEPARTMENT_UPDATE_ERROR).to.equal('Department update error');
      expect(DEPARTMENT_DELETION_ERROR).to.equal('Department deletion error');
    });
  });

  describe('Department Validators', () => {
    it('should have createDepartmentValidator with required name and code', () => {
      expect(createDepartmentValidator.name).to.exist;
      expect(createDepartmentValidator.name.exists).to.exist;
      expect(createDepartmentValidator.code).to.exist;
      expect(createDepartmentValidator.code.exists).to.exist;
    });

    it('should have updateDepartmentValidator with optional name', () => {
      expect(updateDepartmentValidator.name).to.exist;
      expect(updateDepartmentValidator.name.optional).to.be.true;
    });
  });

  describe('Department Handlers', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
      req = createMockRequest({
        user: { id: 1 },
        body: {
          name: 'Engineering',
          code: 'ENG',
          description: 'Software and systems'
        },
        params: { id: '1' }
      });
      res = createMockResponse();
    });

    afterEach(() => {
      sinon.restore();
    });

    describe('Create Department Handler', () => {
      it('should create department and audit log successfully', async () => {
        const mockDept = {
          id: 1,
          name: 'Engineering',
          code: 'ENG',
          description: 'Software and systems',
          createdBy: 1
        };

        sinon.stub(Department, 'create').resolves(mockDept as any);
        sinon.stub(Audit, 'create').resolves({} as any);

        await createDepartmentHandler(req, res);

        expect(res.status).to.have.been.calledWith(201);
        expect(res.json).to.have.been.calledWith(
          sinon.match({
            message: 'Department created successfully',
            department: mockDept
          })
        );
      });

      it('should return 500 when Department.create fails', async () => {
        sinon.stub(Department, 'create').rejects(new Error('DB error'));

        await createDepartmentHandler(req, res);

        expect(res.status).to.have.been.calledWith(500);
        expect(res.json).to.have.been.calledWith(
          sinon.match({ message: DEPARTMENT_CREATION_ERROR })
        );
      });
    });

    describe('Get All Departments Handler', () => {
      it('should return all departments successfully', async () => {
        const mockList = [{ id: 1, name: 'Engineering' }];
        sinon.stub(Department, 'findAll').resolves(mockList as any);

        await getAllDepartmentsHandler(req, res);

        expect(res.status).to.have.been.calledWith(200);
        expect(res.json).to.have.been.calledWith({ departments: mockList });
      });

      it('should return 500 when findAll fails', async () => {
        sinon.stub(Department, 'findAll').rejects(new Error('DB error'));

        await getAllDepartmentsHandler(req, res);

        expect(res.status).to.have.been.calledWith(500);
        expect(res.json).to.have.been.calledWith(
          sinon.match({ message: DEPARTMENT_GET_ERROR })
        );
      });
    });

    describe('Get Department By ID Handler', () => {
      it('should return department when found', async () => {
        const mockDept = { id: 1, name: 'Engineering' };
        sinon.stub(Department, 'findByPk').resolves(mockDept as any);

        await getDepartmentByIdHandler(req, res);

        expect(res.status).to.have.been.calledWith(200);
        expect(res.json).to.have.been.calledWith({ department: mockDept });
      });

      it('should return 404 when department is not found', async () => {
        sinon.stub(Department, 'findByPk').resolves(null);

        await getDepartmentByIdHandler(req, res);

        expect(res.status).to.have.been.calledWith(404);
        expect(res.json).to.have.been.calledWith({ message: DEPARTMENT_NOT_FOUND });
      });

      it('should return 500 when findByPk throws error', async () => {
        sinon.stub(Department, 'findByPk').rejects(new Error('DB error'));

        await getDepartmentByIdHandler(req, res);

        expect(res.status).to.have.been.calledWith(500);
        expect(res.json).to.have.been.calledWith(
          sinon.match({ message: DEPARTMENT_GET_ERROR })
        );
      });
    });

    describe('Update Department Handler', () => {
      it('should update department and log audit successfully', async () => {
        const mockDept = {
          id: 1,
          name: 'Engineering',
          code: 'ENG',
          toJSON: () => ({ id: 1, name: 'Engineering', code: 'ENG' })
        };
        const updatedDept = {
          id: 1,
          name: 'IT',
          code: 'IT'
        };

        const findByPkStub = sinon.stub(Department, 'findByPk');
        findByPkStub.onFirstCall().resolves(mockDept as any);
        findByPkStub.onSecondCall().resolves(updatedDept as any);

        sinon.stub(Department, 'update').resolves([1] as any);
        sinon.stub(Audit, 'create').resolves({} as any);

        await updateDepartmentHandler(req, res);

        expect(res.status).to.have.been.calledWith(200);
        expect(res.json).to.have.been.calledWith(
          sinon.match({
            message: 'Department updated successfully',
            department: updatedDept
          })
        );
      });

      it('should return 404 if department to update does not exist', async () => {
        sinon.stub(Department, 'findByPk').resolves(null);

        await updateDepartmentHandler(req, res);

        expect(res.status).to.have.been.calledWith(404);
        expect(res.json).to.have.been.calledWith({ message: DEPARTMENT_NOT_FOUND });
      });

      it('should return 500 when update fails', async () => {
        sinon.stub(Department, 'findByPk').rejects(new Error('DB error'));

        await updateDepartmentHandler(req, res);

        expect(res.status).to.have.been.calledWith(500);
        expect(res.json).to.have.been.calledWith(
          sinon.match({ message: DEPARTMENT_UPDATE_ERROR })
        );
      });
    });

    describe('Delete Department Handler', () => {
      it('should delete department and log audit successfully', async () => {
        const mockDept = {
          id: 1,
          name: 'Engineering',
          toJSON: () => ({ id: 1, name: 'Engineering' }),
          destroy: sinon.stub().resolves()
        };

        sinon.stub(Department, 'findByPk').resolves(mockDept as any);
        sinon.stub(Audit, 'create').resolves({} as any);

        await deleteDepartmentHandler(req, res);

        expect(res.status).to.have.been.calledWith(200);
        expect(res.json).to.have.been.calledWith({ message: 'Department deleted successfully' });
        expect(mockDept.destroy).to.have.been.calledOnce;
      });

      it('should return 404 when department to delete does not exist', async () => {
        sinon.stub(Department, 'findByPk').resolves(null);

        await deleteDepartmentHandler(req, res);

        expect(res.status).to.have.been.calledWith(404);
        expect(res.json).to.have.been.calledWith({ message: DEPARTMENT_NOT_FOUND });
      });

      it('should return 500 when delete throws error', async () => {
        sinon.stub(Department, 'findByPk').rejects(new Error('DB error'));

        await deleteDepartmentHandler(req, res);

        expect(res.status).to.have.been.calledWith(500);
        expect(res.json).to.have.been.calledWith(
          sinon.match({ message: DEPARTMENT_DELETION_ERROR })
        );
      });
    });
  });
});
