import { Request } from 'express';
import { ObjectId } from 'mongoose';
import { Admin } from '../schema/admin.schema';

interface ExtendAdminInfo {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminRequest extends Request {
  admin: Admin & ExtendAdminInfo;
}
