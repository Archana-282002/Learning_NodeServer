import { EndpointAuthType, EndpointRequestType, EndpointHandler, reportError } from 'node-server-engine';
import { Response } from 'express';
import { Employee, Department, Audit } from 'db';
import { CacheService, CACHE_TTL } from '../../redis';
import {
  EMPLOYEE_CREATION_ERROR,
  EMPLOYEE_GET_ERROR,
  DEPARTMENT_NOT_FOUND_FOR_EMPLOYEE
} from './employee.const';

/**
 * 1. Create a new Employee (With Redis Cache Invalidation)
 * POST /employees
 */
export const createEmployeeHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
) => {
  const { firstName, lastName, email, phoneNumber, salary, departmentId } = req.body;
  const { user } = req;

  try {
    // Verify that the department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      res.status(400).json({
        message: `Department with ID ${departmentId} does not exist. Please use an existing department ID.`
      });
      return;
    }

    const employee = await Employee.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      salary,
      departmentId,
      createdBy: user?.id
    });

    // Create Audit record
    await Audit.create({
      entityType: 'Employee',
      entityId: employee.id,
      action: 'CREATE',
      newData: employee,
      performedBy: user?.id
    });

    // ⚡ Invalidate Redis cache so next GET retrieves new employee
    await CacheService.del('employees:all');
    await CacheService.del(`employees:dept:${departmentId}`);

    res.status(201).json({
      message: 'Employee created successfully',
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`.trim() || employee.firstName,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phoneNumber: employee.phoneNumber,
        salary: employee.salary,
        departmentId: employee.departmentId,
        department: department.name,
        createdAt: employee.createdAt
      }
    });
  } catch (error: any) {
    reportError(error);
    if (error?.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({
        message: `An employee with the email "${email}" already exists. Please use a unique email address.`,
        error: 'Duplicate email violation'
      });
      return;
    }
    res.status(500).json({ message: EMPLOYEE_CREATION_ERROR, error });
  }
};

/**
 * 2. Retrieve all employees for a specific department ID (With Redis Caching)
 * GET /departments/:departmentId/employees
 */
export const getEmployeesByDepartmentHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
) => {
  const { departmentId } = req.params;
  const cacheKey = `employees:dept:${departmentId}`;

  try {
    // 1. Check Redis Cache First
    const cachedData = await CacheService.get<any>(cacheKey);
    if (cachedData) {
      res.status(200).json({
        ...cachedData,
        source: 'Redis Cache ⚡'
      });
      return;
    }

    // 2. Check if department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      res.status(404).json({ message: DEPARTMENT_NOT_FOUND_FOR_EMPLOYEE });
      return;
    }

    // 3. Query all employees matching departmentId with associated Department
    const employees = await Employee.findAll({
      where: { departmentId },
      include: [
        {
          model: Department,
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['id', 'ASC']]
    });

    // 4. Format response to show department name clearly
    const formattedEmployees = employees.map((emp) => {
      const json = emp.toJSON();
      return {
        id: json.id,
        name: `${json.firstName} ${json.lastName}`.trim() || json.firstName,
        firstName: json.firstName,
        lastName: json.lastName,
        email: json.email,
        phoneNumber: json.phoneNumber,
        salary: json.salary,
        departmentId: json.departmentId,
        department: json.department ? json.department.name : department.name,
        createdAt: json.createdAt
      };
    });

    const responsePayload = {
      department: department.name,
      departmentId: department.id,
      employees: formattedEmployees,
      total: formattedEmployees.length
    };

    // 5. Store in Redis with TTL (5 minutes = 300 seconds)
    await CacheService.set(cacheKey, responsePayload, CACHE_TTL.EMPLOYEES);

    res.status(200).json({
      ...responsePayload,
      source: 'PostgreSQL Database 🐘'
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EMPLOYEE_GET_ERROR, error });
  }
};

/**
 * 3. Retrieve all employees with their department names (With Redis Caching)
 * GET /employees
 */
export const getAllEmployeesHandler: EndpointHandler<EndpointAuthType.JWT> = async (
  _req: EndpointRequestType[EndpointAuthType.JWT],
  res: Response
) => {
  const cacheKey = 'employees:all';

  try {
    // 1. Check Redis Cache first
    const cachedData = await CacheService.get<{ employees: any[]; total: number }>(cacheKey);
    if (cachedData) {
      console.log('⚡ [REDIS CACHE HIT] Loaded employees instantly from Redis');
      res.status(200).json({
        ...cachedData,
        source: 'Redis Cache ⚡'
      });
      return;
    }

    // 2. Cache Miss: Fetch from PostgreSQL database
    console.log('🐘 [CACHE MISS] Fetching employees from PostgreSQL database...');
    const employees = await Employee.findAll({
      include: [
        {
          model: Department,
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['id', 'ASC']]
    });

    const formattedEmployees = employees.map((emp) => {
      const json = emp.toJSON();
      return {
        id: json.id,
        name: `${json.firstName} ${json.lastName}`.trim() || json.firstName,
        firstName: json.firstName,
        lastName: json.lastName,
        email: json.email,
        phoneNumber: json.phoneNumber,
        salary: json.salary,
        departmentId: json.departmentId,
        department: json.department ? json.department.name : null,
        createdAt: json.createdAt
      };
    });

    const responsePayload = {
      employees: formattedEmployees,
      total: formattedEmployees.length
    };

    // 3. Store result in Redis with 5 minutes TTL (300 seconds)
    await CacheService.set(cacheKey, responsePayload, CACHE_TTL.EMPLOYEES);

    // 4. Return to frontend
    res.status(200).json({
      ...responsePayload,
      source: 'PostgreSQL Database 🐘'
    });
  } catch (error) {
    reportError(error);
    res.status(500).json({ message: EMPLOYEE_GET_ERROR, error });
  }
};
