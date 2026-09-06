import prisma from '../prisma';
import { CategoryDTO } from '@expense-tracker/shared';

export class CategoryService {
  /**
   * Get all system default categories and user custom categories.
   */
  static async getCategories(userId: string): Promise<CategoryDTO[]> {
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId }, { isDefault: true }],
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      isDefault: cat.isDefault,
      userId: cat.userId,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    }));
  }
}
