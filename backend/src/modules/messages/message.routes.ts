import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { messageController } from './message.controller';
import { conversationIdSchema, sendMessageSchema, startConversationSchema } from './message.schema';

const router = Router();

router.use(authenticate);

router.get('/conversations', asyncHandler(messageController.listConversations));
router.post('/conversations', validateRequest(startConversationSchema), asyncHandler(messageController.startConversation));
router.get('/conversations/:id', validateRequest(conversationIdSchema), asyncHandler(messageController.getMessages));
router.post('/conversations/:id/messages', validateRequest(sendMessageSchema), asyncHandler(messageController.send));

export const messageRoutes = router;
