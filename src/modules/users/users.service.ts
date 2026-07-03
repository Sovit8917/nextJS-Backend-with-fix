import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/address.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { data: user };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return { message: 'Profile updated', data: user };
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
    return { message: 'FCM token updated' };
  }

  // Addresses
  async getAddresses(userId: string) {
    const addresses = await this.prisma.address.findMany({ where: { userId } });
    return { data: addresses };
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
  if (dto.isDefault) {
    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }
  const address = await this.prisma.address.create({
    data: {
      ...dto,
      state: dto.state ?? '',
      pincode: dto.pincode ?? '',
      latitude: dto.latitude ?? 0,
      longitude: dto.longitude ?? 0,
      userId,
    },
  });
  return { message: 'Address added', data: address };
}

  async updateAddress(userId: string, addressId: string, dto: CreateAddressDto) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
    return { message: 'Address updated', data: updated };
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    await this.prisma.address.delete({ where: { id: addressId } });
    return { message: 'Address deleted' };
  }

  async getSavedCards(userId: string) {
    const cards = await this.prisma.savedCard.findMany({ where: { userId } });
    return { data: cards };
  }

  async deleteSavedCard(userId: string, cardId: string) {
    await this.prisma.savedCard.deleteMany({ where: { id: cardId, userId } });
    return { message: 'Card removed' };
  }
}
