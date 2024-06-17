import { Request } from 'express';
import { User } from 'src/users/schema/user.schema';

export interface UserRequest extends Request {
  user: User;
}
