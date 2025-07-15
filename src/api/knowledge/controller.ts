// knowledge.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UseGuards,
  Req,
  Query,
  Get,
  Param,
  Put,
  Delete,
  Patch,
  NotFoundException,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { AuthenticatedRequest } from '@auth/types';
import { FileIngestionService } from './services/file-ingestion';
import { CreateTableDTO, EnrichTableDTO, PaginationQueryDTO } from './types';
import { TableService } from './services/table';
import { RowService } from './services/row';
import { ToolService } from '@tools/services/tool.service';
import { ColumnType } from './enums';
import { UserService } from '@user/user.service';

@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly fileIngestionService: FileIngestionService,
    private readonly tableService: TableService,
    private readonly rowService: RowService,
    private readonly toolService: ToolService,
    private readonly userService: UserService,
  ) {}

  @Patch('tables/:tableId/files')
  @UseInterceptors(FilesInterceptor('files'))
  async embedFiles(
    @Req() req: AuthenticatedRequest,
    @Param('tableId') tableId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const user = req.user;

    if (!files || files.length === 0) {
      throw new BadRequestException('No file is uploaded');
    }

    const table = await this.tableService.findByIdOrFail(user.id, tableId);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Loop through files and process them
    await Promise.all(
      files.map(async (file) => {
        await this.fileIngestionService.addFileRows(
          user.id,
          table,
          file.buffer,
          file.originalname,
        );
      }),
    );

    const reloadedTable = await this.tableService.findByIdOrFail(
      user.id,
      tableId,
    );
    return reloadedTable;
  }

  @Post('tables')
  async createTable(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateTableDTO,
  ) {
    const user = req.user;
    const userEntity = await this.userService.findFullOne(user.id);
    return this.tableService.createTable(userEntity, body);
  }

  @Get('tables')
  async listUserTables(
    @Req() req: AuthenticatedRequest,
    @Query() query: PaginationQueryDTO,
  ) {
    const user = req.user;
    const { page = 1, limit = 10 } = query;
    return this.tableService.listTables(user.id, page, limit);
  }

  @Get('tables/:tableId')
  async getTableById(
    @Req() req: AuthenticatedRequest,
    @Param('tableId') tableId: string,
  ) {
    const user = req.user;
    console.log('user', user);
    return this.tableService.findByIdOrFail(user.id, tableId);
  }

  @Get('tables/:tableId/rows')
  async getRowsForTable(
    @Req() req: AuthenticatedRequest,
    @Param('tableId') tableId: string,
  ) {
    const user = req.user;
    return this.rowService.listRowsForTable(user.id, tableId);
  }

  @Post('tables/:tableId/rows')
  async createRow(
    @Req() req: AuthenticatedRequest,
    @Param('tableId') tableId: string,
    @Body() body: Record<string, any>,
  ) {
    const user = req.user;
    return this.rowService.createRow(user.id, tableId, body);
  }

  @Put('tables/:tableId/rows/:rowId')
  async updateRow(
    @Req() req: AuthenticatedRequest,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Body() body: any,
  ) {
    const user = req.user;
    return this.rowService.updateRow(user.id, {
      tableId,
      rowId,
      data: body,
    });
  }

  @Delete('tables/:tableId/rows/:rowId')
  async deleteRow(
    @Req() req: AuthenticatedRequest,
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
  ) {
    const user = req.user;
    return this.rowService.deleteRow(user.id, tableId, rowId);
  }

  @Post('tables/:tableId/columns')
  async createColumn(
    @Req() req: AuthenticatedRequest,
    @Param('tableId') tableId: string,
    @Body() body: any,
  ) {
    const user = req.user;
    return this.tableService.addColumn(user.id, {
      tableId,
      columnName: body.columnName,
      columnType: body.columnType,
    });
  }

  @Delete('tables/:tableId/columns/:columnId')
  async deleteColumn(
    @Req() req: AuthenticatedRequest,
    @Param('tableId') tableId: string,
    @Param('columnId') columnId: string,
  ) {
    const user = req.user;
    return this.tableService.removeColumnAndReEmbed(user.id, tableId, columnId);
  }

  // add enrich with tools

  // knowledge.controller.ts
  @Post('tables/:tableId/enrich')
  async enrichTable(
    @Req() req: AuthenticatedRequest,
    @Param('tableId') tableId: string,
    @Body() body: EnrichTableDTO,
  ) {
    const user = req.user;

    const tool = await this.toolService.findOne(body.toolId, user.id);
    const table = await this.tableService.findByIdOrFail(user.id, tableId);

    // 2) Fetch rows
    const rows = await this.rowService.listRowsForTable(user.id, tableId);
    if (!rows.length) {
      return { message: 'No rows to enrich.' };
    }

    // 3) Build input array for the tool
    //    body.mapper: { rowField -> toolField }
    //    For each row, we create an input object with the tool fields.
    const inputs = rows.map((row) => {
      const inputObj: Record<string, any> = {};
      for (const [rowField, toolField] of Object.entries(body.mapper)) {
        inputObj[toolField] = row.data[rowField]; // Map row's data to the tool's field name
      }
      return inputObj;
    });

    await this.createMissingColumnsForOutputs(
      user.id,
      tableId,
      body.outputFields,
    );

    // 4) Decide if we do a single invoke or a bulk invoke
    let results: any[];
    if (rows.length === 1) {
      // Single row -> invoke once
      const result = await this.toolService.invoke(
        body.toolId,
        user.id,
        inputs[0],
      );
      results = [result];
    } else {
      // Multiple rows -> bulk invoke for parallel calls
      results = await this.toolService.bulkInvoke(body.toolId, inputs, user.id);
    }

    // 5) For each row, merge the result’s output fields into row.data
    //    body.outputFields = list of fields to copy from the tool's output
    const updatedRows = await Promise.all(
      rows.map(async (row, i) => {
        const output = results[i];
        if (output && typeof output === 'object') {
          const outputData: Record<string, any> = {};
          for (const field of body.outputFields) {
            outputData[field] = output[field]; // copy from tool’s JSON
          }
          // Merge into row.data
          row.data = { ...row.data, ...outputData };

          // Optional: store the entire output object if you want
          // row.data.toolOutput = output;

          // Save updated row
          return this.rowService.updateRow(user.id, {
            tableId,
            rowId: row.id,
            data: row.data,
          });
        }
        return row; // if error or no output
      }),
    );

    const reloadedTable = await this.tableService.findByIdOrFail(
      user.id,
      tableId,
    );
    return reloadedTable;
  }

  private async createMissingColumnsForOutputs(
    userId: string,
    tableId: string,
    outputFields: string[],
  ): Promise<void> {
    // 1) Fetch the table with existing columns
    const table = await this.tableService.findByIdOrFail(userId, tableId);
    // table.columns might be partial or optional if you omit them from `select`/`relations`,
    // so ensure your findByIdOrFail includes them.

    // 2) Collect existing column names
    const existingColumnNames = (table.columns || []).map((col) => col.name);

    // 3) For each field in outputFields, if not present, create a new column
    for (const field of outputFields) {
      if (!existingColumnNames.includes(field)) {
        await this.tableService.addColumn(userId, {
          tableId,
          columnName: field,
          columnType: ColumnType.TEXT, // or detect type if you have logic
        });
        existingColumnNames.push(field);
      }
    }
  }
}
