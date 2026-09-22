import { Module } from '@nestjs/common';
import { DofusService } from './dofus.service';
import { DofusController } from './dofus.controller';

@Module({
  controllers: [DofusController],
  providers: [DofusService],
})
export class DofusModule {}
