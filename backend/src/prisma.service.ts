
import { Injectable } from '@nestjs/common';
import {PrismaClient} from '@/mysql-prisma-client/index';

@Injectable()
export class PrismaService extends PrismaClient {
 
}
