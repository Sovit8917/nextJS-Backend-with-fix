import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { memoryStorage } from 'multer';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('single')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadSingle(@UploadedFile() file: Express.Multer.File, @Query('folder') folder: string) {
    return this.uploadService.uploadFile(file, folder || 'general').then((url) => ({
      message: 'File uploaded',
      data: { url },
    }));
  }

  @Post('multiple')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5, { storage: memoryStorage() }))
  uploadMultiple(@UploadedFiles() files: Express.Multer.File[], @Query('folder') folder: string) {
    return this.uploadService.uploadMultiple(files, folder || 'general').then((urls) => ({
      message: 'Files uploaded',
      data: { urls },
    }));
  }
}
