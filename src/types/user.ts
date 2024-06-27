import { Request } from 'express';
import { ObjectId } from 'mongoose';
import { User } from 'src/users/schema/user.schema';

interface ExtendUserInfo {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRequest extends Request {
  user: User & ExtendUserInfo;
}
