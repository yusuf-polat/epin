import { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { messageService } from './message.service';
import { StartConversationDTO } from './message.types';

export const messageController = {
  async listConversations(req: Request, res: Response) {
    return sendSuccess(res, await messageService.listConversations(req.user!.id));
  },

  async startConversation(req: Request, res: Response) {
    const { targetUserId, productId } = req.body as StartConversationDTO;
    return sendSuccess(res, await messageService.getOrCreateConversation(req.user!.id, targetUserId, productId));
  },

  async getMessages(req: Request, res: Response) {
    return sendSuccess(res, await messageService.getMessages(req.params.id, req.user!.id));
  },

  async send(req: Request, res: Response) {
    return sendSuccess(res, await messageService.send(req.params.id, req.user!.id, req.body.text), undefined, 201);
  },
};
