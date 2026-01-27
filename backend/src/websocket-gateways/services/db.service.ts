import { Injectable } from '@nestjs/common';
import { Prisma } from "@/mysql-prisma-client/index";
import { PrismaService } from "./../../prisma.service";

@Injectable()
export class DBService {
    constructor(private readonly prismaService: PrismaService) {}
  createAudioRecord(data: Prisma.AudioCreateInput) {
    return this.prismaService.audio.create({
      data,
    });
  }

  listAudioRecords(page=1, pageSize=100) {
    return this.prismaService.audio.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}