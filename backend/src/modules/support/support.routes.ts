import { Router } from 'express';
import { audited } from '@/modules/audit/audit.middleware';
import { authenticate, requireStaff } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validateRequest';
import { asyncHandler } from '@/utils/asyncHandler';
import { supportController } from './support.controller';
import { addTicketMessageSchema, createTicketSchema, listTicketsSchema, ticketIdSchema, updateTicketSchema } from './support.schema';

const router = Router();

router.use(authenticate);

// Destek ekibi (/tickets/:id'den önce)
router.get('/admin/tickets', requireStaff, validateRequest(listTicketsSchema), asyncHandler(supportController.listAll));
router.patch('/admin/tickets/:id', requireStaff, validateRequest(updateTicketSchema), audited('support.update', 'TICKET', 'Destek talebi güncellendi'), asyncHandler(supportController.update));

// Kullanıcı
router.post('/tickets', validateRequest(createTicketSchema), asyncHandler(supportController.create));
router.get('/tickets', asyncHandler(supportController.listMine));
router.get('/tickets/:id', validateRequest(ticketIdSchema), asyncHandler(supportController.getById));
router.post('/tickets/:id/messages', validateRequest(addTicketMessageSchema), asyncHandler(supportController.addMessage));

export const supportRoutes = router;
