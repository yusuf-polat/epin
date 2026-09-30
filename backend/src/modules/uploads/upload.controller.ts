import { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { uploadService } from './upload.service';

export const uploadController = {
  async uploadImage(req: Request, res: Response) {
    return sendSuccess(res, await uploadService.saveImage(req.body.image), 'Görsel yüklendi');
  },
};
