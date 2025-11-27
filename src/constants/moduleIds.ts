export const MODULE_IDS = {
  library: 1,
  manualUpload: 2,
  batchUpload: 3,
  departments: 4,
  documentTypes: 5,
  fields: 6,
  allocation: 7,
  templates: 8,
  approvalMatrix: 9,
  maskingSetup: 10,
  users: 11,
  userAccess: 12,
  auditTrail: 13,
} as const;

export type ModuleKey = keyof typeof MODULE_IDS;


