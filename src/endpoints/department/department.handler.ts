import { EndpointAuthType, EndpointRequestType, EndpointHandler, reportError } from 'node-server-engine';
import { Response } from 'express';
import { Department, Audit } from 'db';
import { CacheService, CACHE_TTL } from '../../redis';
import {
  DEPARTMENT_NOT_FOUND,
  DEPARTMENT_CREATION_ERROR,
  DEPARTMENT_GET_ERROR,
  DEPARTMENT_UPDATE_ERROR,
  DEPARTMENT_DELETION_ERROR
} from './department.const';

export const createDepartmentHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
) => {
  const { name, code, description } = req.body;
  const { user } = req;
  try {
    const department = await Department.create({
      name,
      code,
      description,
      createdBy: user?.id
    });

    // Create Audit record (plain JSON for PostgreSQL)
    await Audit.create({
      entityType: 'Department',
      entityId: department.id,
      action: 'CREATE',
      newData: department.toJSON(),
      performedBy: user?.id
    });

    // ⚡ Invalidate Redis cache
    await CacheService.del('departments:all');

    res.status(201).json({ message: 'Department created successfully', department });
  } catch (error: any) {
    reportError(error);
    if (error?.name === 'SequelizeUniqueConstraintError') {
      const field = error?.errors?.[0]?.path || 'name or code';
      res.status(409).json({
        message: `A department with this ${field} ("${field === 'code' ? code : name}") already exists. Please use a unique ${field}.`,
        error: 'Duplicate department violation'
      });
      return;
    }
    res.status(500).json({ message: DEPARTMENT_CREATION_ERROR, error: error?.message || error });
  }
};

export const getAllDepartmentsHandler: EndpointHandler<EndpointAuthType.JWT> = async (req, res: Response) => {
  try {
    const hasPagination = req.query?.page !== undefined || req.query?.limit !== undefined;

    if (hasPagination) {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
      const offset = (page - 1) * limit;

      const { rows: departments, count: total } = await Department.findAndCountAll({
        limit,
        offset,
        order: [['id', 'ASC']]
      });

      const totalPages = Math.ceil(total / limit) || 1;

      res.status(200).json({
        departments,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      });
      return;
    }

    // 1. Check Redis Cache
    const cached = await CacheService.get('departments:all');
    if (cached) {
      console.log('⚡ [REDIS CACHE HIT] Loaded departments instantly from Redis Cache');
      res.status(200).json({
        ...cached,
        source: 'Redis Cache ⚡'
      });
      return;
    }

    console.log('🐘 [CACHE MISS] Fetching departments from PostgreSQL (Short TTL: 15s)...');
    const departments = await Department.findAll({ order: [['id', 'ASC']] });
    const responsePayload = { departments };

    // 2. Save in Redis with Short TTL (15 seconds)
    await CacheService.set('departments:all', responsePayload, CACHE_TTL.DEPARTMENTS);

    res.status(200).json({
      ...responsePayload,
      source: 'PostgreSQL Database 🐘'
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: DEPARTMENT_GET_ERROR, error });
  }
};

export const getDepartmentByIdHandler: EndpointHandler<EndpointAuthType.JWT> = async (req, res: Response) => {
  const { id } = req.params;
  const cacheKey = `department:${id}`;

  try {
    // 1. Check Redis Cache
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        ...cached,
        source: 'Redis Cache ⚡'
      });
      return;
    }

    const department = await Department.findByPk(id);
    if (!department) {
      res.status(404).json({ message: DEPARTMENT_NOT_FOUND });
      return;
    }

    const responsePayload = { department };
    // 2. Save in Redis with TTL (2 minutes = 120 seconds)
    await CacheService.set(cacheKey, responsePayload, CACHE_TTL.DEPARTMENTS);

    res.status(200).json({
      ...responsePayload,
      source: 'PostgreSQL Database 🐘'
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: DEPARTMENT_GET_ERROR, error });
  }
};

export const updateDepartmentHandler: EndpointHandler<EndpointAuthType.JWT> = async (req, res: Response) => {
  const { id } = req.params;
  const { user } = req;
  const { name, code, description } = req.body;
  try {
    const department = await Department.findByPk(id);
    if (!department) {
      res.status(404).json({ message: DEPARTMENT_NOT_FOUND });
      return;
    }
    const previousData = department.toJSON();
    await Department.update({ name, code, description }, { where: { id } });
    const updated = await Department.findByPk(id);

    await Audit.create({
      entityType: 'Department',
      entityId: id,
      action: 'UPDATE',
      previousData,
      newData: updated ? updated.toJSON() : undefined,
      performedBy: user?.id
    });

    // ⚡ Invalidate Redis Caches
    await CacheService.del(`department:${id}`);
    await CacheService.del('departments:all');
    await CacheService.del('employees:all');

    res.status(200).json({ message: 'Department updated successfully', department: updated });
  } catch (error: any) {
    reportError(error);
    if (error?.name === 'SequelizeUniqueConstraintError') {
      const field = error?.errors?.[0]?.path || 'name or code';
      res.status(409).json({
        message: `A department with this ${field} already exists. Please use a unique value.`,
        error: 'Duplicate department violation'
      });
      return;
    }
    res.status(500).json({ message: DEPARTMENT_UPDATE_ERROR, error: error?.message || error });
  }
};

export const deleteDepartmentHandler: EndpointHandler<EndpointAuthType.JWT> = async (req, res: Response) => {
  const { id } = req.params;
  const { user } = req;
  try {
    const department = await Department.findByPk(id);
    if (!department) {
      res.status(404).json({ message: DEPARTMENT_NOT_FOUND });
      return;
    }
    await Audit.create({
      entityType: 'Department',
      entityId: id,
      action: 'DELETE',
      previousData: department.toJSON(),
      performedBy: user?.id
    });
    await department.destroy();

    // ⚡ Invalidate Redis Caches
    await CacheService.del(`department:${id}`);
    await CacheService.del('departments:all');
    await CacheService.del('employees:all');

    res.status(200).json({ message: 'Department deleted successfully' });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: DEPARTMENT_DELETION_ERROR, error });
  }
};
