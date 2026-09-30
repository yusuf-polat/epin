import { logger } from '@/utils/logger';
import { auditRepository } from './audit.repository';
import { AuditEntry, AuditListQuery } from './audit.types';

export const auditService = {
  /** İşlem geçmişi yazımı asıl işlemi hiçbir zaman başarısız kılmaz */
  async record(entry: AuditEntry) {
    try {
      await auditRepository.create(entry);
    } catch (err) {
      logger.error('Audit log yazılamadı', { action: entry.action, err });
    }
  },

  list(query: AuditListQuery) {
    return auditRepository.findMany(query);
  },
};
