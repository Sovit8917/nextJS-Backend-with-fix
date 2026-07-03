import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    const categories = await this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { services: true } } },
    });
    return { data: categories };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { services: { where: { isActive: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return { data: category };
  }

  async create(data: any) {
    const category = await this.prisma.category.create({ data });
    return { message: 'Category created', data: category };
  }

  async update(id: string, data: any) {
    const category = await this.prisma.category.update({ where: { id }, data });
    return { message: 'Category updated', data: category };
  }

  async remove(id: string) {
    await this.prisma.category.update({ where: { id }, data: { isActive: false } });
    return { message: 'Category deleted' };
  }
}
