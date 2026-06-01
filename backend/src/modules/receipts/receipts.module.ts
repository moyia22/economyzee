import { Module } from '@nestjs/common';
import { ReceiptOcrService } from './receipt-ocr.service';
import { NfceParserService } from './nfce-parser.service';

import { FinancialParserModule } from '../financial-parser/financial-parser.module';

@Module({
  imports: [FinancialParserModule],
  providers: [ReceiptOcrService, NfceParserService],
  exports: [ReceiptOcrService, NfceParserService],
})
export class ReceiptsModule {}
