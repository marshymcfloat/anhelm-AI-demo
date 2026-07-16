import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BrandsModule } from './brands/brands.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule, BrandsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
