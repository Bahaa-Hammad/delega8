import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  Res,
  Header,
  Query,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ToolService } from './services/tool.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { AuthenticatedRequest } from '@auth/types';
import { TemplateToolService } from './services/template.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '@src/api/admin/admin.guard';
import { ToolInvokeOnFly } from './types';
import { Response } from 'express';

@Controller('tools')
export class ToolController {
  constructor(
    private readonly toolService: ToolService,
    private readonly templateToolService: TemplateToolService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('templates')
  getTemplates(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.templateToolService.findAllTemplates();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':toolId/export')
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="tool-export.json"')
  async exportTool(
    @Param('toolId') toolId: string,
    @Query('userId') userId: string,
    @Res() res: Response,
  ) {
    const exportedData = await this.templateToolService.exportAsJson(
      toolId,
      userId,
    );

    // Convert to a nicely formatted JSON string
    const fileContents = JSON.stringify(exportedData, null, 2);

    // Send it as a file download
    res.send(fileContents);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/import')
  @UseInterceptors(FileInterceptor('file')) // the field name in the form must be "file"
  async importToolFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('userId') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Convert buffer to string, then parse JSON
    const jsonString = file.buffer.toString();
    let data: any;
    try {
      data = JSON.parse(jsonString);
    } catch (err) {
      throw new BadRequestException('Invalid JSON file');
    }

    // Now call the service method that creates a new tool from JSON
    const newTool = await this.templateToolService.importFromJson(data, userId);

    // Return the newly created tool
    return newTool;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createToolDto: CreateToolDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const tool = await this.toolService.create(user.id, createToolDto);
    // return the tool without the user
    return {
      ...tool,
      user: undefined,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    const tools = await this.toolService.findAll(user.id);
    // return the tools without the user
    return tools.map((tool) => ({
      ...tool,
      user: undefined,
    }));
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    const tool = await this.toolService.findOne(id, user.id);
    // return the tool without the user
    return {
      ...tool,
      user: undefined,
    };
  }
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() updateToolDto: UpdateToolDto,
  ) {
    const user = req.user;
    const tool = await this.toolService.update(id, updateToolDto, user.id);
    // return the tool without the user
    return {
      ...tool,
      user: undefined,
    };
  }
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.toolService.remove(id, user.id);
  }
  @UseGuards(JwtAuthGuard)
  @Post(':id/invoke')
  invoke(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: any,
  ) {
    const user = req.user;
    return this.toolService.invoke(id, user.id, input);
  }
  @UseGuards(JwtAuthGuard)
  @Post(':id/bulk-invoke')
  bulkInvoke(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() input: any[],
  ) {
    const user = req.user;
    return this.toolService.bulkInvoke(id, input, user.id);
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id/invocations')
  getInvocations(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.toolService.getInvocations(user.id, id);
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id/invocations/:invocationId')
  getInvocation(
    @Param('id') id: string,
    @Param('invocationId') invocationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.toolService.getInvocation(user.id, id, invocationId);
  }

  // get all templates
  @UseGuards(JwtAuthGuard)
  @Post(':id/publish-requests')
  publishRequest(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.templateToolService.requestPublish(id, user.id);
  }

  @UseGuards(AdminGuard)
  @Post(':id/publish')
  publish(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.templateToolService.publish(id);
  }
  @UseGuards(JwtAuthGuard)
  @Post(':id/clone')
  clone(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.templateToolService.cloneToUser(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invoke-on-fly')
  invokeOnFly(@Body() input: ToolInvokeOnFly) {
    return this.toolService.invokeOnFly(input);
  }
}
