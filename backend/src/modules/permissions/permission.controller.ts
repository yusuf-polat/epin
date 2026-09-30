import { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { PERMISSIONS } from './permission.constants';
import { permissionService } from './permission.service';

export const permissionController = {
  async list(_req: Request, res: Response) {
    const items = await permissionService.list();
    return sendSuccess(res, { available: PERMISSIONS, assignments: items });
  },

  async setForRole(req: Request, res: Response) {
    const result = await permissionService.setForRole(req.body.role, req.body.permissions);
    return sendSuccess(res, result, `${req.body.role} rolünün izinleri güncellendi`);
  },
};
